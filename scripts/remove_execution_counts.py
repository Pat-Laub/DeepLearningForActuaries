#!/usr/bin/env python3
"""
Remove non-deterministic data-execution_count attributes from Quarto HTML files.

With `cache: true` (and `freeze: false`), Quarto pulls cell *outputs* from
jupyter-cache (stable), but assigns the outer `<div class="cell">`'s
`data-execution_count` from the live kernel's In[n] counter during the render
pass. The kernel's starting offset varies between renders (depending on how many
cells re-execute / what setup runs), so every outer count shifts uniformly by
±1, producing spurious diffs in the committed HTML.

These attributes are purely informational — Quarto's HTML output doesn't display
In[]/Out[] prompts and no CSS references them — so we simply strip them to make
the output deterministic. This mirrors remove_cell_ids.py.

Usage:
    python remove_execution_counts.py docs/**/*.html
"""

import re
import sys
from pathlib import Path
from glob import glob


def remove_execution_counts(html_path: Path) -> bool:
    """
    Remove ` data-execution_count="N"` attributes from div tags.

    Returns True if file was modified.
    """
    content = html_path.read_text(encoding='utf-8')
    original = content

    content = re.sub(
        r' data-execution_count="\d+"',
        '',
        content
    )

    if content != original:
        html_path.write_text(content, encoding='utf-8')
        return True
    return False


def main():
    pattern = sys.argv[1] if len(sys.argv) > 1 else "docs/**/*.html"
    files = sorted(glob(pattern, recursive=True))
    modified_count = 0

    for file_path in files:
        path = Path(file_path)
        if remove_execution_counts(path):
            modified_count += 1
            print(f"✓ {path}")

    print(f"\nModified {modified_count} of {len(files)} files")


if __name__ == "__main__":
    main()
