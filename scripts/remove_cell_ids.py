#!/usr/bin/env python3
"""
Remove random cell IDs from Quarto HTML files.

This is the simpler approach - just remove the id attribute entirely
from cell divs, making the HTML output deterministic.

Usage:
    python remove_cell_ids_simple.py docs/**/*.html
"""

import re
import sys
from pathlib import Path
from glob import glob


def remove_cell_ids(html_path: Path) -> bool:
    """
    Remove id attributes from cell divs.

    Returns True if file was modified.
    """
    content = html_path.read_text(encoding='utf-8')
    original = content

    # Remove id="XXXXXXXX" from cell divs
    # Pattern: <div id="[8 hex chars]" class="cell"
    content = re.sub(
        r'<div id="[a-f0-9]{8}" class="cell"',
        '<div class="cell"',
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
        if remove_cell_ids(path):
            modified_count += 1
            print(f"✓ {path}")

    print(f"\nModified {modified_count} of {len(files)} files")


if __name__ == "__main__":
    main()
