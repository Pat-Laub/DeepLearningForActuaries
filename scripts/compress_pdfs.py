#!/usr/bin/env python3
"""
Compress the slide PDFs produced by decktape, in place, with Ghostscript.

decktape exports large (tens of MB) PDFs because headless Chrome embeds the
slide images at full resolution. This replaces the manual "open in Acrobat ->
Compress PDF" step with a tuned Ghostscript pass that:

  * downsamples oversized raster images to a screen-friendly DPI (bicubic),
  * lets Ghostscript keep line-art/screenshots lossless (AutoFilter) and passes
    existing JPEG photos through untouched, so no new lossy degradation is
    introduced (unlike the blunt -dPDFSETTINGS=/ebook preset),
  * de-duplicates repeated images (e.g. the logo/background on every slide).

On the benchmark deck this matched/beat Acrobat's "Compress" output at
comparable quality. A file is only replaced if the result is actually smaller.

Note: output is not byte-for-byte reproducible (Ghostscript stamps a random
/ID, and decktape's input already varies run-to-run), so the PDFs remain
churning binaries in git — same as the previous Acrobat workflow.

Config (environment variables):
  COMPRESS_DPI    target image resolution in dpi (default 200)
  COMPRESS_JOBS   parallel Ghostscript processes (default min(4, cpu, n))

Usage (post-render): reads QUARTO_PROJECT_OUTPUT_FILES and compresses the .pdf
                     decktape produced for each rendered .slides.html.
Usage (manual):      python compress_pdfs.py "docs/**/*.pdf"
"""

import concurrent.futures
import os
import re
import shutil
import subprocess
import sys
import tempfile
from glob import glob

GS = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
DPI = os.getenv("COMPRESS_DPI", "200")


def _gs_command(src, dst):
    return [
        GS,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.6",
        "-dNOPAUSE", "-dBATCH", "-dQUIET",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true", "-dSubsetFonts=true",
        "-dDownsampleColorImages=true", "-dColorImageDownsampleType=/Bicubic",
        f"-dColorImageResolution={DPI}", "-dColorImageDownsampleThreshold=1.0",
        "-dDownsampleGrayImages=true", "-dGrayImageDownsampleType=/Bicubic",
        f"-dGrayImageResolution={DPI}", "-dGrayImageDownsampleThreshold=1.0",
        "-dDownsampleMonoImages=true", "-dMonoImageResolution=300",
        "-dAutoFilterColorImages=true", "-dAutoFilterGrayImages=true",
        "-dPassThroughJPEGImages=true",
        # decktape's headless-Chrome PDFs tag images with /ICCBased colour
        # spaces; Ghostscript rewrites these with an empty (/Length 0) profile.
        # Poppler/Acrobat fall back to DeviceRGB, but Apple's Quartz renderer
        # (Preview, Safari) is stricter and silently drops every affected image.
        # Converting to DeviceRGB drops the broken profiles entirely (gray
        # images/soft-masks stay gray, JPEGs still pass through untouched).
        "-dColorConversionStrategy=/RGB", "-dProcessColorModel=/DeviceRGB",
        f"-sOutputFile={dst}",
        src,
    ]


def compress(pdf):
    """Compress pdf in place. Returns (pdf, before_bytes, after_bytes)."""
    before = os.path.getsize(pdf)
    fd, tmp = tempfile.mkstemp(suffix=".pdf", dir=os.path.dirname(pdf) or ".")
    os.close(fd)
    try:
        subprocess.run(
            _gs_command(pdf, tmp), check=True, capture_output=True, text=True
        )
        after = os.path.getsize(tmp)
        if 0 < after < before:
            os.replace(tmp, pdf)  # atomic; same directory
            return pdf, before, after
        os.remove(tmp)  # gs didn't shrink it — keep the original
        return pdf, before, before
    except subprocess.CalledProcessError as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise Exception(f"gs failed on {pdf}\n{e.stdout or ''}\n{e.stderr or ''}")


def _targets():
    if len(sys.argv) > 1:
        return sorted(glob(sys.argv[1], recursive=True))
    # post-render: the .pdf decktape produced for each rendered .slides.html
    pdfs = []
    for f in os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "").split("\n"):
        if f.endswith(".slides.html"):
            pdf = re.sub(r"\.slides\.html$", ".pdf", f)
            if os.path.exists(pdf):
                pdfs.append(pdf)
    return pdfs


def _mb(n):
    return f"{n / 1_000_000:.1f} MB"


def main():
    if not GS:
        print("compress_pdfs: Ghostscript (gs) not found on PATH — skipping.")
        return

    pdfs = _targets()
    if not pdfs:
        return

    max_workers = int(os.getenv("COMPRESS_JOBS", "0")) or min(
        4, os.cpu_count() or 4, len(pdfs)
    )
    print(f"Compressing {len(pdfs)} PDF(s) at {DPI} dpi with {max_workers} worker(s)...")

    failures = []
    saved = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(compress, p): p for p in pdfs}
        for future in concurrent.futures.as_completed(futures):
            pdf = futures[future]
            try:
                _, before, after = future.result()
                saved += before - after
                pct = (1 - after / before) * 100 if before else 0
                print(f"✓ {pdf}  {_mb(before)} -> {_mb(after)}  (-{pct:.0f}%)")
            except Exception as exc:
                failures.append(pdf)
                print(f"✗ {pdf}\n{exc}")

    kept = len(pdfs) - len(failures)
    print(f"\nCompressed {kept}/{len(pdfs)} PDF(s), saved {_mb(saved)} total")
    if failures:
        raise Exception(
            f"Failed to compress {len(failures)} PDF(s): " + ", ".join(failures)
        )


if __name__ == "__main__":
    main()
