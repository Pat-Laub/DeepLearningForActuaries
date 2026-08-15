#!/usr/bin/env python3
"""
Convert the RevealJS decks to PDF with Reveal's own print-pdf mode.

Replaces decktape_pdfs.py without the decktape Node.js package: each deck is
loaded in headless Chrome with ?print-pdf appended, which makes Reveal lay
every slide out as a fixed-size page (the deck's configured 1120x700), and
Chrome's --print-to-pdf captures that print view. pdfMaxPagesPerSlide=1 is
passed through the query string (Reveal merges query params into its config)
so an overflowing slide is clipped to one page, like decktape's screenshots.

Differences from the decktape output: pages are the deck's 1120x700 rather
than decktape's 1280x720 viewport, and text/vector graphics stay vector
instead of being screenshot pixels — smaller files, selectable text.

The output directory is served through a small local HTTP server that injects
two print-layout fixes into each .slides.html before Chrome sees it:
  1. Inject a script that restores Quarto's per-slide footers (image
     attributions etc.), which Reveal's print view otherwise drops.
  2. Inject a requestAnimationFrame shim, without which Reveal's print-view
     setup stalls and prints one blank page (see RAF_SHIM_JS).
(YouTube thumbnails and author-supplied print replacements are already embedded
in the published deck by the print-media Quarto extension, so ordinary browser
PDF export gets the same deterministic media as this automated path.)
(The menu icons that decktape had to hide with injected CSS are already
hidden by Quarto's own html.print-pdf rules in print view.)

Config (environment variables):
  CHROME_PATH        path to the Chrome/Chromium binary (else common
                     locations and PATH are searched)
  PRINT_SLIDES_JOBS  parallel Chrome processes (default min(4, cpu, n))

Usage (post-render): reads QUARTO_PROJECT_OUTPUT_FILES.
Usage (manual):      python scripts/print_slides_pdfs.py [docs/**/*.slides.html]
"""

import concurrent.futures
import http.server
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from glob import glob
from urllib.parse import quote

OUTPUT_DIR = "docs"

# Make requestAnimationFrame resolve under --virtual-time-budget.
#
# Reveal builds the print view in PrintView.activate(), an async method that
# awaits four requestAnimationFrames: the last one gates the step that
# actually appends the finished `.pdf-page` boxes to the document. rAF
# callbacks only run when the compositor produces a frame, and under
# --virtual-time-budget headless Chrome stops producing them once the page
# goes idle — so that final callback never fires. Everything earlier in
# activate() has already run (the @page rule is injected, the body is
# resized), but no page is ever appended, and Chrome prints a single blank
# page. Which decks lose depends on whether activate() started synchronously
# at init or from the `load` event, so it looks arbitrary: it hit every deck
# in this template, and in bigger courses only some decks failed until
# several Chromes ran in parallel (PRINT_SLIDES_JOBS>1).
#
# Routing rAF through setTimeout makes those awaits depend on the timer
# queue, which --virtual-time-budget fast-forwards, so the chain always
# completes. Injected into <head> so it is in place before reveal.js loads,
# and gated on print-pdf so it only ever affects the copy this server hands
# to Chrome, never the decks published to docs/. (Printing wants the layout
# finished as fast as possible; there is no animation to keep smooth here.)
RAF_SHIM_JS = """<script>
(function () {
  if (!/print-pdf/gi.test(window.location.search)) return;
  window.requestAnimationFrame = function (cb) {
    return setTimeout(function () { cb(performance.now()); }, 0);
  };
  window.cancelAnimationFrame = function (id) { clearTimeout(id); };
})();
</script>"""

# Quarto's per-slide footers (::: footer, used for image attributions) are
# missing from Reveal's print view: in live mode the support plugin clones
# the current slide's .footer up to the viewport on each slide change (the
# in-slide copy stays hidden via `.reveal .slide .footer{display:none}`),
# but that machinery is skipped when printing (`if (!isPrintView())`), so
# nothing ever shows the footers. Recreate the effect per printed page:
# copy each slide's own footer — or the deck's default footer, honouring
# data-footer="false" — into its .pdf-page box, absolutely positioned at
# the same 18px bottom offset the live footer uses (position:fixed, as the
# live CSS has it, would repeat on every printed page instead).
SHOW_FOOTERS_JS = """<script>
(function () {
  if (!/print-pdf/gi.test(window.location.search)) return;
  function widenTo16x9() {
    // Reveal sizes print pages to the deck (1120x700 + 10% margin = 1232x770,
    // 16:10). Widen the @page and page boxes to 16:9 (1369x770) so the
    // viewport background shows as a band on the right, matching the old
    // decktape output at its 1280x720 viewport. Added after Reveal's own
    // @page rule so it wins the cascade.
    var pageW = Math.round(770 * 16 / 9);
    var st = document.createElement('style');
    // Also bring back the theme's yellow side bar: revealjs-style.scss hides
    // it in print because the old 16:10 page margin (~56px) couldn't fit the
    // 100px bar — the 16:9 page margin can. Appended last, so it wins.
    st.textContent = '@page{size:' + pageW + 'px 770px;margin:0}' +
      '.print-pdf .slide-background::after{display:block !important;width:100px !important;}';
    document.head.appendChild(st);
    document.body.style.width = pageW + 'px';
    document.querySelectorAll('.pdf-page').forEach(function (page) {
      page.style.width = pageW + 'px';
      // A transform makes the page box monolithic for CSS fragmentation
      // (the same reason decktape's live-view capture never lost content:
      // Reveal's transform:scale() was in the ancestor chain). Without it,
      // print fragmentation pushes any monolithic child that doesn't fit
      // the remaining page space (an <img>, or a line of inline-block
      // ::: columns) wholly onto the next page, where pdfMaxPagesPerSlide=1
      // clips it to nothing. Each .pdf-page exactly fits one printed page,
      // so as one monolithic unit its overflow is simply clipped in place —
      // matching the live view.
      page.style.transform = 'scale(1)';
      // Re-centre the slide box in the widened page (Reveal positioned it
      // for the old width), mirroring the live theme's centring in 16:9.
      var slide = page.querySelector('section');
      if (slide) {
        slide.style.left = ((pageW - slide.offsetWidth) / 2) + 'px';
        // Reveal offsets the section 35px down and stretches it to the page
        // height, so its box crosses the printed page's bottom edge — which
        // makes CSS fragmentation run inside it, pushing any monolithic
        // child (<img>, inline-block ::: columns) that straddles the edge
        // wholly onto the next page, where pdfMaxPagesPerSlide=1 clips it
        // to nothing. Start the box at 0 instead and move it down with a
        // transform: same visual position, but the box no longer crosses
        // the page edge (and a transformed box is itself monolithic), so
        // overflow is simply clipped in place like the live view.
        var top = slide.offsetTop;
        if (top > 0) {
          slide.style.setProperty('top', '0px', 'important');
          slide.style.setProperty(
            'transform', 'translateY(' + top + 'px)', 'important'
          );
        }
        // With the box inside the page, overflow:hidden makes the section a
        // scroll container — monolithic in CSS fragmentation — so content
        // taller than the page (e.g. a ::: columns line-box with a portrait
        // image) is clipped in place rather than pushed. This needs an
        // explicit height (auto would collapse the clip to the content).
        //
        // Height it to the deck's own slide height, not the page height: the
        // page is taller by the print margin, and anything the theme anchors
        // to the bottom of the slide (::: footer, Quarto's footnote <aside>,
        // which is position:absolute; bottom:20px) follows the box it sits in.
        // Stretching that box to the page pushed those asides below the
        // printed page edge, so multi-line footnotes lost their last line.
        var deckH = (window.Reveal && typeof Reveal.getConfig === 'function'
          && Reveal.getConfig().height) || (page.clientHeight - 2 * top);
        // Preserve Reveal's original page-height containing block for embeds
        // that explicitly size themselves with a percentage height. Quarto's
        // video shortcode emits `height="80%"`; after the print server swaps
        // that iframe for a thumbnail, changing its containing block from the
        // 770px print box to the 700px deck box makes Reveal's stretch/layout
        // calculation cover the title and footer on that slide. Ordinary
        // slides still use deckH so bottom-anchored footnotes stay in bounds.
        var percentageHeightContent = Array.prototype.some.call(
          slide.querySelectorAll('[height], [style]'),
          function (el) {
            var attr = (el.getAttribute('height') || '').trim();
            var inline = (el.style && el.style.height || '').trim();
            return /%$/.test(attr) || /%$/.test(inline);
          }
        );
        var slideH = percentageHeightContent ? page.clientHeight : deckH;
        slide.style.setProperty('height', slideH + 'px', 'important');
        slide.style.setProperty('overflow', 'hidden', 'important');
      }
    });
  }
  function fixSlideNumbers() {
    // Reveal's print view numbers pages with a flat counter (innerHTML=v++),
    // ignoring the slideNumber format and data-visibility="uncounted" (the
    // auto-agenda divider slides here). Recompute live-view numbers: the
    // 1-based position among counted slides, formatted like SlideNumber's
    // "c" / "c/t" markup. (Reveal's own getSlidePastCount/getTotalSlides
    // can't be used — they query .slides>section, which the print view's
    // .pdf-page wrappers no longer match.)
    var format = window.Reveal && typeof Reveal.getConfig === 'function'
      ? Reveal.getConfig().slideNumber : null;
    if (format !== 'c' && format !== 'c/t') return;
    var pages = Array.prototype.slice.call(document.querySelectorAll('.pdf-page'));
    var entries = pages.map(function (page) {
      var slide = page.querySelector('section');
      return {
        el: page.querySelector('.slide-number'),
        uncounted: !!(slide && slide.getAttribute('data-visibility') === 'uncounted'),
      };
    });
    var total = entries.filter(function (e) { return !e.uncounted; }).length;
    var past = 0;
    entries.forEach(function (e) {
      var current = past + (e.uncounted ? 0 : 1);
      if (e.el) {
        // The spaces between spans render as "x / y", matching live view
        // (Reveal's formatNumber template has whitespace between the spans).
        e.el.innerHTML = '<span class="slide-number-a">' + current + '</span>' +
          (format === 'c/t'
            ? ' <span class="slide-number-delimiter">/</span> ' +
              '<span class="slide-number-b">' + total + '</span>'
            : '');
      }
      if (!e.uncounted) past++;
    });
  }
  function placeFooters() {
    var defaultFooter = document.querySelector('.footer-default');
    document.querySelectorAll('.pdf-page').forEach(function (page) {
      var slide = page.querySelector('section');
      if (!slide) return;
      var footer = slide.querySelector('.footer');
      if (!footer && defaultFooter && slide.getAttribute('data-footer') !== 'false') {
        footer = defaultFooter;
      }
      if (!footer) return;
      var copy = footer.cloneNode(true);
      copy.classList.remove('footer-default');
      copy.style.cssText = 'display:block;position:absolute;bottom:18px;' +
        'left:0;width:100%;text-align:center;font-size:18px;z-index:2;';
      page.style.position = 'relative';
      page.appendChild(copy);
    });
  }
  // Reveal's print view is set up asynchronously (and fires pdf-ready when
  // done); poll as a fallback in case Reveal was ready before this ran.
  var done = false;
  function run() {
    if (!done) { done = true; widenTo16x9(); fixSlideNumbers(); placeFooters(); }
  }
  if (window.Reveal && typeof Reveal.on === 'function') {
    Reveal.on('pdf-ready', run);
  }
  var ticks = 0;
  var id = setInterval(function () {
    if (document.querySelector('.pdf-page')) { run(); clearInterval(id); }
    if (++ticks > 3000) clearInterval(id);
  }, 10);
})();
</script>"""


def find_chrome():
    """Locate a Chrome/Chromium binary: CHROME_PATH, common paths, then PATH."""
    candidates = [
        os.getenv("CHROME_PATH"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        path = shutil.which(name)
        if path:
            return path
    return None


CHROME = find_chrome()


class RewritingHandler(http.server.SimpleHTTPRequestHandler):
    # Silence per-request access logging — with several Chrome instances
    # hitting the server in parallel it just floods the terminal.
    def log_message(self, *args, **kwargs):
        pass

    # Chrome gets terminated once its PDF is written (it never exits by
    # itself; see print_to_pdf), so in-flight requests routinely die with a
    # broken pipe. Swallow those instead of spraying tracebacks into the
    # quarto render log.
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if path.endswith('.slides.html'):
            fs_path = self.translate_path(path)
            try:
                with open(fs_path, 'rb') as f:
                    body = f.read()
            except OSError:
                self.send_error(404)
                return
            text = body.decode('utf-8', errors='replace')
            if RAF_SHIM_JS not in text and '<head>' in text:
                text = text.replace('<head>', f'<head>{RAF_SHIM_JS}', 1)
            if SHOW_FOOTERS_JS not in text and '</body>' in text:
                text = text.replace('</body>', f'{SHOW_FOOTERS_JS}</body>', 1)
            body = text.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def start_local_server(directory):
    handler_class = lambda *args, **kwargs: RewritingHandler(
        *args, directory=directory, **kwargs
    )
    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler_class)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    return server, f"http://127.0.0.1:{port}"


def _pdf_complete(path):
    """True when `path` looks like a fully written PDF (%PDF ... %%EOF)."""
    try:
        size = os.path.getsize(path)
        if size < 1024:
            return False
        with open(path, "rb") as f:
            if f.read(5) != b"%PDF-":
                return False
            f.seek(-1024, os.SEEK_END)
            return b"%%EOF" in f.read()
    except OSError:
        return False


def _pdf_page_count(path):
    """Number of page objects in a written PDF (0 if unreadable)."""
    try:
        with open(path, "rb") as f:
            return len(re.findall(rb"/Type\s*/Page\b", f.read()))
    except OSError:
        return 0


def _deck_slide_count(path):
    """Number of <section> tags in the deck file — an upper bound on slides."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return len(re.findall(r"<section\b", f.read()))
    except OSError:
        return 0


def print_to_pdf(url, output, timeout=240, deck=None, attempts=3):
    """Print the deck at `url` (already in print-pdf mode) to `output`.

    A safety net for the blank-page failure RAF_SHIM_JS fixes: if Chrome ever
    still captures the page before Reveal lays out the print view, the PDF is
    a single blank page. Detect that signature (a one-page PDF for a
    multi-section deck) and retry after a short settle delay; accept the last
    attempt either way, warning so the deck can be re-run.
    """
    expected = _deck_slide_count(deck) if deck else 0
    for attempt in range(1, attempts + 1):
        _print_once(url, output, timeout)
        if expected <= 1 or _pdf_page_count(output) > 1:
            return output
        if attempt < attempts:
            time.sleep(2)
    print(
        f"warning: {output} has 1 page but the deck has ~{expected} "
        "sections — the PDF may be blank; re-run the script to redo it."
    )
    return output


def _print_once(url, output, timeout=240):
    """Single print attempt for print_to_pdf (see that for the retry logic).

    Recent Chrome versions (observed with 150 on macOS) write the PDF but
    then never exit in headless --print-to-pdf mode, so we can't just wait
    on the process: instead watch for the finished PDF (stable size with
    %PDF/%%EOF markers), then terminate Chrome ourselves.
    """
    # Each Chrome gets its own throwaway profile so parallel instances don't
    # fight over a user-data-dir (and the real browser profile is untouched).
    with tempfile.TemporaryDirectory(prefix="chrome-print-") as profile:
        command = [
            CHROME,
            "--headless",
            # Enable software WebGL (SwiftShader) instead of disabling the GPU
            # entirely: Plotly 3-D plots (go.Surface) need a WebGL context,
            # which --disable-gpu drops, leaving "WebGL is not supported" in
            # the PDF. SwiftShader renders WebGL in software, no GPU required.
            "--enable-unsafe-swiftshader",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-crashpad",
            "--disable-background-networking",
            "--disable-component-update",
            f"--user-data-dir={profile}",
            # Fast-forward timers so Reveal/KaTeX/etc. finish their setup
            # before printing, without real-time waiting.
            "--virtual-time-budget=30000",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output}",
            url,
        ]
        if os.path.exists(output):
            os.remove(output)
        # DEVNULL, not pipes: Chrome's crash-handler/updater children inherit
        # the streams and would keep a pipe open long after the print is done.
        proc = subprocess.Popen(
            command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        try:
            deadline = time.monotonic() + timeout
            last_size = -1
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    break  # Chrome exited by itself (older, better-behaved versions).
                if _pdf_complete(output):
                    size = os.path.getsize(output)
                    if size == last_size:
                        break  # Complete and stable across a polling interval.
                    last_size = size
                time.sleep(0.5)
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()

    if not _pdf_complete(output):
        raise Exception(f"Chrome produced no complete PDF for {url} within {timeout}s")
    return output


def _collect_slides():
    """
    Decide which .slides.html decks to convert, in priority order:

      1. CLI arguments — file paths or globs. Both .slides.html and .pdf paths
         are accepted (a .pdf is mapped back to its .slides.html source), and
         globs already expanded by the shell work too.
      2. QUARTO_PROJECT_OUTPUT_FILES — the newline-separated list Quarto sets
         when this runs as a post-render step.
      3. Neither — default to every .slides.html under the output directory.
    """
    if len(sys.argv) > 1:
        candidates = []
        for arg in sys.argv[1:]:
            candidates.extend(glob(arg, recursive=True) or [arg])
    else:
        env = os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "")
        if env.strip():
            candidates = env.split("\n")
        else:
            candidates = glob(f"{OUTPUT_DIR}/**/*.slides.html", recursive=True)

    slides = []
    for path in candidates:
        path = re.sub(r"\.pdf$", ".slides.html", path.strip())
        if path.endswith(".slides.html") and os.path.isfile(path) and path not in slides:
            slides.append(path)
    return slides


def main():
    # The progress lines use ✓/✗, which a Windows console running the legacy
    # cp1252 code page cannot encode: printing one raises UnicodeEncodeError
    # from inside the results loop, and the except branch then dies on ✗ too,
    # so a perfectly good render ends in a traceback.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    slides_files = _collect_slides()
    if not slides_files:
        print("print_slides_pdfs: no .slides.html files to convert.")
        return

    if not CHROME:
        # Not fatal: the website and slides rendered fine, only the optional
        # PDF copies are skipped. Install Chrome (or set CHROME_PATH) to get
        # them back.
        print(
            "print_slides_pdfs: no Chrome/Chromium found — skipping slide "
            "PDFs (set CHROME_PATH to override)."
        )
        return

    # Sequential by default — each conversion only takes a few seconds now;
    # set PRINT_SLIDES_JOBS=N to run several Chromes in parallel.
    max_workers = int(os.getenv("PRINT_SLIDES_JOBS", "1"))

    server, url_base = start_local_server(OUTPUT_DIR)

    def convert(file):
        pdf_file = re.sub(r"\.slides\.html$", ".pdf", file)
        rel_path = os.path.relpath(file, OUTPUT_DIR)
        url = (
            f"{url_base}/{'/'.join(quote(part) for part in rel_path.split(os.sep))}"
            "?print-pdf&pdfMaxPagesPerSlide=1"
        )
        print_to_pdf(url, os.path.abspath(pdf_file), deck=file)
        return pdf_file

    print(
        f"Printing {len(slides_files)} slide deck(s) to PDF "
        f"with {max_workers} parallel worker(s)..."
    )

    failures = []
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {pool.submit(convert, file): file for file in slides_files}
            for future in concurrent.futures.as_completed(futures):
                file = futures[future]
                try:
                    print(f"✓ {future.result()}")
                except Exception as exc:
                    failures.append(file)
                    print(f"✗ {file}\n{exc}")
    finally:
        server.shutdown()
        server.server_close()

    if failures:
        raise Exception(
            f"Failed to convert {len(failures)} slide deck(s) to PDF: "
            + ", ".join(failures)
        )


if __name__ == "__main__":
    main()
