#!/usr/bin/env python3
"""Pre-render: compile Lectures/interactive-splits/*.jsx to plain JS.

The individual-claim-reserving lecture loads precompiled components from
interactive-splits/compiled/ (as ES modules), instead of shipping Babel
standalone and transforming JSX in every visitor's browser. The .jsx files
remain the editable source of truth; this script keeps compiled/ in sync.

Uses esbuild via npx (downloaded and cached by npx on first use). Compiling
is skipped when every compiled file is newer than its source, so ordinary
renders stay fast and work offline.
"""

import subprocess
import sys
from pathlib import Path

src_dir = Path(__file__).resolve().parent.parent / "Lectures" / "interactive-splits"
out_dir = src_dir / "compiled"
out_dir.mkdir(exist_ok=True)

stale = [
    jsx
    for jsx in sorted(src_dir.glob("*.jsx"))
    if not (js := out_dir / f"{jsx.stem}.js").exists()
    or js.stat().st_mtime < jsx.stat().st_mtime
]
if not stale:
    sys.exit(0)

print(f"Compiling {len(stale)} interactive-splits JSX file(s) with esbuild")
subprocess.run(
    ["npx", "--yes", "esbuild", *map(str, stale),
     "--loader:.jsx=jsx", f"--outdir={out_dir}"],
    check=True,
)
