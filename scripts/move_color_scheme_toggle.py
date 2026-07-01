#!/usr/bin/env python3
"""
Move Quarto's colour-scheme toggle out of the collapsible sidebar.

Quarto renders the light/dark toggle inside `.sidebar-tools-main`, which itself
lives under `#quarto-sidebar`. At narrow widths the sidebar is hidden, and a
fixed-position child cannot render through a hidden ancestor.

This post-render step keeps Quarto's original toggle and JS behaviour, but
relocates it into two responsive places:

  * a desktop copy in the top-level page chrome, styled as the floating pill;
  * a mobile copy inside the secondary navbar, so it aligns with search and
    hides with Quarto's Headroom header on scroll.

Quarto's `setColorSchemeToggle()` updates every `.quarto-color-scheme-toggle`,
so the two copies stay visually in sync after clicks or OS-theme changes.

Idempotent after a post-render pass: re-running the script leaves the page
unchanged.

Usage (manual):
    python scripts/move_color_scheme_toggle.py
"""

import os
import re
from glob import glob
from pathlib import Path

OUTPUT_DIR = "docs"

SIDEBAR_TOGGLE_RE = re.compile(
    r'\s*<div class="sidebar-tools-main">\s*'
    r'(<a\b[^>]*\bquarto-color-scheme-toggle\b[^>]*>.*?</a>)\s*'
    r"</div>",
    re.DOTALL,
)

TOP_LEVEL_TOGGLE_RE = re.compile(
    r'\n<a\b[^>]*\bquarto-color-scheme-toggle\b[^>]*>.*?</a>'
    r'(?=\s*<header id="quarto-header")',
    re.DOTALL,
)

MOBILE_TOGGLE_RE = re.compile(
    r'\s*<a\b[^>]*\bquarto-color-scheme-toggle-mobile\b[^>]*>.*?</a>',
    re.DOTALL,
)

INSERT_AFTER = '<div id="quarto-search-results"></div>'
SEARCH_BUTTON_RE = re.compile(
    r'(\s*<button type="button" class="btn quarto-search-button"'
    r'[^>]*>\s*<i class="bi bi-search"></i>\s*</button>)',
    re.DOTALL,
)


def _with_class(anchor: str, class_name: str) -> str:
    """Return `anchor` with `class_name` added to its class attribute."""
    match = re.search(r'class="([^"]*)"', anchor)
    if not match:
        return anchor.replace("<a ", f'<a class="{class_name}" ', 1)

    classes = [
        cls
        for cls in match.group(1).split()
        if cls
        not in {
            "quarto-color-scheme-toggle-desktop",
            "quarto-color-scheme-toggle-mobile",
        }
    ]
    if class_name not in classes:
        classes.append(class_name)

    return anchor[: match.start(1)] + " ".join(classes) + anchor[match.end(1):]


def move_toggle(html_path: Path) -> bool:
    """Move the sidebar colour-scheme toggle. Returns True if changed."""
    content = html_path.read_text(encoding="utf-8")
    original = content

    match = SIDEBAR_TOGGLE_RE.search(content)
    if match:
        toggle = match.group(1)
    else:
        match = TOP_LEVEL_TOGGLE_RE.search(content)
        if not match:
            return False
        toggle = match.group(0).strip()

    content = SIDEBAR_TOGGLE_RE.sub("", content)
    content = TOP_LEVEL_TOGGLE_RE.sub("", content)
    content = MOBILE_TOGGLE_RE.sub("", content)

    if INSERT_AFTER not in content or not SEARCH_BUTTON_RE.search(content):
        return False

    desktop_toggle = _with_class(toggle, "quarto-color-scheme-toggle-desktop")
    mobile_toggle = _with_class(toggle, "quarto-color-scheme-toggle-mobile")

    content = content.replace(INSERT_AFTER, f"{INSERT_AFTER}\n{desktop_toggle}", 1)
    content = SEARCH_BUTTON_RE.sub(r"\1\n      " + mobile_toggle, content, count=1)

    if content != original:
        html_path.write_text(content, encoding="utf-8")
        return True
    return False


def target_files() -> list[Path]:
    """HTML pages to process: changed files from Quarto, else a docs glob."""
    env = os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "").strip()
    if env:
        candidates = env.split("\n")
    else:
        candidates = glob(f"{OUTPUT_DIR}/**/*.html", recursive=True)

    return [
        Path(f)
        for f in candidates
        if f.endswith(".html") and not f.endswith(".slides.html")
    ]


def main() -> None:
    files = target_files()
    modified = 0
    for path in files:
        if path.exists() and move_toggle(path):
            modified += 1
            print(f"✓ {path}")

    print(f"\nMoved colour-scheme toggle on {modified} of {len(files)} pages")


if __name__ == "__main__":
    main()
