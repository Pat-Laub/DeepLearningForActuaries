import concurrent.futures
import http.server
import os
import re
import socketserver
import subprocess
import threading
import urllib.error
import urllib.request
from urllib.parse import quote

OUTPUT_DIR = "docs"

YOUTUBE_IFRAME_RE = re.compile(
    r'<iframe\b[^>]*\bsrc="https?://www\.youtube\.com/embed/([\w-]+)[^"]*"[^>]*>\s*</iframe>',
    re.IGNORECASE,
)

# Hides the chalkboard/notes-canvas icons in the PDF only — the live HTML keeps them.
HIDE_OVERLAY_CSS = '<style>.slide-chalkboard-buttons{display:none!important;}</style>'


# Probe each video's maxresdefault availability at most once per build. The
# threaded server may call this concurrently for the same id; a duplicate HEAD
# is harmless, and dict writes are atomic under the GIL.
_thumbnail_cache = {}


def _thumbnail_url(video_id):
    """
    Best available YouTube thumbnail URL for video_id.

    maxresdefault.jpg is the highest resolution but 404s on many older videos;
    hqdefault.jpg exists for every video. We resolve the choice here with a
    server-side HEAD request and emit a single known-good URL, rather than a
    client-side onerror fallback whose second request would race decktape's
    screenshot (leaving a grey box in the PDF).
    """
    if video_id not in _thumbnail_cache:
        maxres = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
        hq = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        url = hq
        try:
            req = urllib.request.Request(
                maxres, method="HEAD", headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    url = maxres
        except urllib.error.HTTPError:
            pass  # maxresdefault missing (404) -> use hqdefault
        except urllib.error.URLError:
            pass  # network hiccup -> fall back to the always-present hqdefault
        _thumbnail_cache[video_id] = url
    return _thumbnail_cache[video_id]


def _replace_youtube_iframe(match):
    full = match.group(0)
    video_id = match.group(1)
    width = re.search(r'width="(\d+)"', full)
    height = re.search(r'height="(\d+)"', full)
    width_attr = f' width="{width.group(1)}"' if width else ''
    height_attr = f' height="{height.group(1)}"' if height else ''
    return (
        f'<img src="{_thumbnail_url(video_id)}"'
        f'{width_attr}{height_attr} alt="YouTube thumbnail">'
    )


class RewritingHandler(http.server.SimpleHTTPRequestHandler):
    # Rewrites .slides.html on the fly before decktape sees the page:
    #   1. Swap YouTube iframes for thumbnail <img> tags — iframes only partially
    #      render under headless Chrome so the JPG never paints.
    #   2. Inject CSS to hide the chalkboard/notes-canvas corner icons.

    # Silence per-request access logging — with several decktape Chrome
    # instances hitting the server in parallel it just floods the terminal.
    def log_message(self, *args, **kwargs):
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
            text = YOUTUBE_IFRAME_RE.sub(_replace_youtube_iframe, text)
            if HIDE_OVERLAY_CSS not in text and '</head>' in text:
                text = text.replace('</head>', f'{HIDE_OVERLAY_CSS}</head>', 1)
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


def decktape(source, output, args=None, docker=False, version='', open=False, capture=True):
    if args is None:
        # --load-pause is a one-time wait after the page loads, before the first
        # slide is exported. It gives reveal.js time to finish its initial
        # layout/auto-scaling so slide 1 (the title) isn't snapshotted at the
        # wrong font size. Unlike -p it doesn't add a delay to every slide.
        args = ['--chrome-arg=--allow-file-access-from-files', '-p', '1', '--load-pause=500', '-s', '1280x720', '--chrome-arg=--no-sandbox', '--fragments=false', '--url-load-timeout=180000', '--page-load-timeout=120000', '--buffer-timeout=120000']

    args = args + [source, output]

    if docker:
        # If Docker is used, this part of the code would be uncommented and adapted
        # command = ['docker', 'run', '--rm', '-t', '-v', '`pwd`:/slides', '-v', f'$HOME:$HOME',
        #            f'astefanutti/decktape{(":" + version) if version else ""}', *args]
        pass
    else:
        if os.name == 'nt':  # Windows
            command = ['decktape.cmd', 'reveal', *args]
        else:
            command = ['decktape', 'reveal', *args]

    try:
        if capture:
            # Capture output so parallel conversions don't interleave their
            # progress bars; the captured text is surfaced only on failure.
            subprocess.run(command, check=True, capture_output=True, text=True)
        else:
            # Let decktape's progress stream straight to the terminal — used
            # for a lone conversion, where there's nothing to interleave with.
            subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        # When streaming, the progress/error already printed live, so don't
        # re-append it (it wasn't captured anyway).
        details = f'\n{e.stdout or ""}\n{e.stderr or ""}' if capture else ''
        raise Exception(f'Failed to convert {source} to PDF{details}')

    if open:
        # For cross-platform file opening, adapt as needed based on the user's OS
        if os.name == 'nt':  # Windows
            os.startfile(output)
        elif os.name == 'posix':  # macOS, Linux, Unix, etc.
            subprocess.run(['open', output] if os.uname().sysname == 'Darwin' else ['xdg-open', output])

    return output


slides_files = [
    file
    for file in os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "").split("\n")
    if re.search(r"\.slides\.html$", file)
]

if slides_files:
    # Conversions are independent (distinct output files) and the HTTP server
    # is threaded, so run several decktape/Chrome processes at once. Each
    # Chrome is fairly heavy, so default to a modest worker count; override
    # with DECKTAPE_JOBS=N for more (or 1 to force sequential).
    max_workers = int(os.getenv("DECKTAPE_JOBS", "0")) or min(
        4, os.cpu_count() or 4, len(slides_files)
    )

    # With a single worker there's no interleaving, so let decktape's progress
    # stream live; with several in flight, capture it to keep the log readable.
    stream_output = max_workers == 1

    server, url_base = start_local_server(OUTPUT_DIR)

    def convert(file):
        pdf_file = re.sub(r"\.slides\.html$", ".pdf", file)
        rel_path = os.path.relpath(file, OUTPUT_DIR)
        url = f"{url_base}/{'/'.join(quote(part) for part in rel_path.split(os.sep))}"
        decktape(url, pdf_file, capture=not stream_output)
        return pdf_file

    print(
        f"Converting {len(slides_files)} slide deck(s) to PDF "
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
