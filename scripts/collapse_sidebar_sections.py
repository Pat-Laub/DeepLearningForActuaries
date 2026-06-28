#!/usr/bin/env python3
"""
Collapse chosen sidebar sections in the rendered Quarto HTML.

Quarto always renders every sidebar section expanded (aria-expanded="true" and a
`show` class on the section's <ul>), with no per-section "start collapsed" knob —
`collapse-level` is global and would collapse everything. We used to fix this with
a client-side <script> that closed the section after page load; this does the same
edit at build time instead, so no JavaScript runs in the browser.

For each section named in SECTIONS_TO_COLLAPSE we, on every page:
  * drop the `show` class from the section's <ul>;
  * add `collapsed` and set aria-expanded="false" on its toggle anchors,
EXCEPT on pages whose active link lives inside that section — there Quarto's
default (expanded) is kept so the current page stays visible in the sidebar.
This mirrors exactly what the old script did (it keyed off `.sidebar-link.active`).

Idempotent: once a section is collapsed its <ul> no longer carries `show`, so a
re-run skips it. Surgical regex edits (no HTML reparse) keep the committed
docs/ diffs minimal.

Usage (manual):
    python scripts/collapse_sidebar_sections.py
"""

import os
import re
import sys
from glob import glob
from pathlib import Path

OUTPUT_DIR = "docs"

# Sidebar section headings (the menu text) to collapse by default.
SECTIONS_TO_COLLAPSE = {"Exercises", "Labs"}


def _section_id(html: str, name: str) -> str | None:
    """Return the quarto-sidebar-section id for the section headed `name`."""
    m = re.search(
        r'data-bs-target="#(quarto-sidebar-section-\d+)"[^>]*>\s*'
        r'<span class="menu-text">' + re.escape(name) + r"</span>",
        html,
    )
    return m.group(1) if m else None


def collapse_sections(html_path: Path) -> bool:
    """Collapse the configured sections on one page. Returns True if changed."""
    content = html_path.read_text(encoding="utf-8")
    original = content

    for name in SECTIONS_TO_COLLAPSE:
        sid = _section_id(content, name)
        if not sid:
            continue  # Section not present on this page.

        # The section's <ul ...>...</ul>. These sections hold a flat list of
        # items (no nested <ul>), so a non-greedy match to the first </ul> is
        # exactly the section body.
        ul = re.search(rf'<ul id="{sid}"[^>]*>.*?</ul>', content, re.DOTALL)
        if not ul:
            continue
        ul_block = ul.group(0)

        if "show" not in ul_block.split(">", 1)[0]:
            continue  # Already collapsed (idempotent re-run / earlier render).
        if "sidebar-link active" in ul_block:
            continue  # Current page lives here — leave it open.

        # Drop the `show` class from this section's <ul> opening tag only.
        new_ul_open = re.sub(
            r'(<ul id="' + re.escape(sid) + r'" class="[^"]*?)\s*\bshow\b',
            r"\1",
            ul.group(0).split(">", 1)[0],
        )
        content = content.replace(ul.group(0).split(">", 1)[0], new_ul_open, 1)

        # Mark both toggle anchors (header + chevron) collapsed.
        content = re.sub(
            r'(<a class=")([^"]*?)("[^>]*?data-bs-target="#'
            + re.escape(sid)
            + r'"[^>]*?aria-expanded=")true(")',
            r"\1\2 collapsed\3false\4",
            content,
        )

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
        if path.exists() and collapse_sections(path):
            modified += 1
            print(f"✓ {path}")

    print(f"\nCollapsed sidebar sections on {modified} of {len(files)} pages")


if __name__ == "__main__":
    main()
