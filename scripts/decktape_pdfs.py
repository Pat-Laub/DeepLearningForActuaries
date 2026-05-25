import http.server
import os
import re
import socketserver
import subprocess
import threading
from urllib.parse import quote

OUTPUT_DIR = "docs"

YOUTUBE_IFRAME_RE = re.compile(
    r'<iframe\b[^>]*\bsrc="https?://www\.youtube\.com/embed/([\w-]+)[^"]*"[^>]*>\s*</iframe>',
    re.IGNORECASE,
)

# Hides the chalkboard/notes-canvas icons in the PDF only — the live HTML keeps them.
HIDE_OVERLAY_CSS = '<style>.slide-chalkboard-buttons{display:none!important;}</style>'


def _replace_youtube_iframe(match):
    full = match.group(0)
    video_id = match.group(1)
    width = re.search(r'width="(\d+)"', full)
    height = re.search(r'height="(\d+)"', full)
    width_attr = f' width="{width.group(1)}"' if width else ''
    height_attr = f' height="{height.group(1)}"' if height else ''
    return (
        f'<img src="https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"'
        f' onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg\';"'
        f'{width_attr}{height_attr} alt="YouTube thumbnail">'
    )


class RewritingHandler(http.server.SimpleHTTPRequestHandler):
    # Rewrites .slides.html on the fly before decktape sees the page:
    #   1. Swap YouTube iframes for thumbnail <img> tags — iframes only partially
    #      render under headless Chrome so the JPG never paints.
    #   2. Inject CSS to hide the chalkboard/notes-canvas corner icons.
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


def decktape(source, output, args=None, docker=False, version='', open=False):
    if args is None:
        args = ['--chrome-arg=--allow-file-access-from-files', '-p', '1', '-s', '1280x720', '--chrome-arg=--no-sandbox', '--fragments=false', '--url-load-timeout=180000', '--page-load-timeout=120000', '--buffer-timeout=120000']

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
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        raise Exception(f'Failed to convert {source} to PDF')

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
    server, url_base = start_local_server(OUTPUT_DIR)
    try:
        for file in slides_files:
            pdf_file = re.sub(r"\.slides\.html$", ".pdf", file)
            rel_path = os.path.relpath(file, OUTPUT_DIR)
            url = f"{url_base}/{'/'.join(quote(part) for part in rel_path.split(os.sep))}"

            print(file)
            print(pdf_file)
            print(f"  serving as {url}")

            decktape(url, pdf_file)
    finally:
        server.shutdown()
        server.server_close()
