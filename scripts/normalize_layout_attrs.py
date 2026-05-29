#!/usr/bin/env python3
"""
Normalise the order of data-layout-* attributes in Quarto HTML files.

Quarto's layout filter emits panel attributes (data-layout-nrow,
data-layout-ncol, ...) by iterating a Lua table with pairs(). Lua 5.4
randomises its string-hash seed per process, so the attribute order
flips between renders, e.g.

    <div class="quarto-layout-panel" data-layout-nrow="2" data-layout-ncol="2">
    <div class="quarto-layout-panel" data-layout-ncol="2" data-layout-nrow="2">

The order is semantically irrelevant but produces noisy git diffs. This
script sorts each run of consecutive data-layout-* attributes into a
canonical (alphabetical) order, making the output reproducible.

Usage:
    python normalize_layout_attrs.py docs/**/*.html
"""

import re
import sys
from pathlib import Path
from glob import glob


# A run of two or more consecutive data-layout-* attributes.
_LAYOUT_RUN = re.compile(
    r'data-layout-[a-z]+="[^"]*"(?:\s+data-layout-[a-z]+="[^"]*")+'
)


def normalize_layout_attrs(html_path: Path) -> bool:
    """
    Sort consecutive data-layout-* attributes alphabetically.

    Returns True if the file was modified.
    """
    content = html_path.read_text(encoding='utf-8')

    new_content = _LAYOUT_RUN.sub(
        lambda m: ' '.join(sorted(m.group(0).split())),
        content,
    )

    if new_content != content:
        html_path.write_text(new_content, encoding='utf-8')
        return True
    return False


def main():
    pattern = sys.argv[1] if len(sys.argv) > 1 else "docs/**/*.html"
    files = sorted(glob(pattern, recursive=True))
    modified_count = 0

    for file_path in files:
        path = Path(file_path)
        if normalize_layout_attrs(path):
            modified_count += 1
            print(f"✓ {path}")

    print(f"\nModified {modified_count} of {len(files)} files")


if __name__ == "__main__":
    main()
