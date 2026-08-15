#!/usr/bin/env python3
"""
Compress the slide PDFs produced by headless Chrome, in place, with Ghostscript.

The uncompressed exports are large because headless Chrome embeds the
slide images at full resolution. This replaces the manual "open in Acrobat ->
Compress PDF" step with a tuned Ghostscript pass that:

  * downsamples oversized raster images to a screen-friendly DPI (bicubic),
  * lets Ghostscript keep line-art/screenshots lossless (AutoFilter) and passes
    existing JPEG photos through untouched, so no new lossy degradation is
    introduced (unlike the blunt -dPDFSETTINGS=/ebook preset),
  * de-duplicates repeated images (e.g. the logo/background on every slide).

It then runs a fast pikepdf pass (see _repair_iccbased) that fixes a Ghostscript
quirk: gs rewrites the slides' /ICCBased colour spaces with an empty (/Length 0)
profile, which Apple's Quartz renderer (Preview, Safari) rejects, silently
dropping every affected image. The pass relabels those to the equivalent device
colour space — losslessly, without re-touching pixel data.

On the benchmark deck this matched/beat Acrobat's "Compress" output at
comparable quality. A file is only replaced if the result is actually smaller.

Note: output is not byte-for-byte reproducible (Ghostscript stamps a random
/ID, and Chrome's input metadata varies run-to-run), so the PDFs remain
churning binaries in git — same as the previous Acrobat workflow.

Config (environment variables):
  COMPRESS_DPI    target image resolution in dpi (default 200)
  COMPRESS_JOBS   parallel Ghostscript processes (default min(4, cpu, n))

Usage (post-render): reads QUARTO_PROJECT_OUTPUT_FILES and compresses the .pdf
                     produced for each rendered .slides.html.
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

try:
    import pikepdf
except ImportError:
    pikepdf = None

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
        f"-sOutputFile={dst}",
        src,
    ]


_DEVICE_CS = pikepdf and {
    1: pikepdf.Name.DeviceGray,
    3: pikepdf.Name.DeviceRGB,
    4: pikepdf.Name.DeviceCMYK,
}


def _repair_iccbased(path):
    """Relabel images whose colour space Ghostscript wrote as /ICCBased with an
    empty (/Length 0) profile back to the equivalent device space, in place.

    Such images render in Poppler/Acrobat (which fall back to the device space)
    but Apple's Quartz renderer (Preview, Safari) is stricter and silently drops
    them. We only rewrite the colour-space label — the (JPEG/Flate) pixel data is
    left byte-for-byte untouched, so this is lossless and ~instant, unlike
    re-converting every image through Ghostscript's colour engine. No-op if
    pikepdf is missing (a warning is printed once in main()).
    """
    if pikepdf is None:
        return 0
    fixed = 0
    with pikepdf.open(path, allow_overwriting_input=True) as pdf:
        for obj in pdf.objects:
            try:
                if obj.get("/Subtype") != pikepdf.Name.Image:
                    continue
                cs = obj.get("/ColorSpace")
                if (
                    isinstance(cs, pikepdf.Array)
                    and len(cs) == 2
                    and cs[0] == pikepdf.Name.ICCBased
                    and len(cs[1].read_bytes()) == 0
                ):
                    n = int(cs[1].get("/N", 3))
                    obj.ColorSpace = _DEVICE_CS.get(n, pikepdf.Name.DeviceRGB)
                    fixed += 1
            except Exception:
                continue
        if fixed:
            pdf.save(
                path,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
            )
    return fixed


def compress(pdf):
    """Compress pdf in place. Returns (pdf, before_bytes, after_bytes)."""
    before = os.path.getsize(pdf)
    fd, tmp = tempfile.mkstemp(suffix=".pdf", dir=os.path.dirname(pdf) or ".")
    os.close(fd)
    try:
        try:
            subprocess.run(
                _gs_command(pdf, tmp), check=True, capture_output=True, text=True
            )
        except subprocess.CalledProcessError as e:
            raise Exception(f"gs failed on {pdf}\n{e.stdout or ''}\n{e.stderr or ''}")
        _repair_iccbased(tmp)  # fix Ghostscript's empty-ICC colour spaces
        after = os.path.getsize(tmp)
        if 0 < after < before:
            os.replace(tmp, pdf)  # atomic; same directory
            return pdf, before, after
        return pdf, before, before  # gs didn't shrink it — keep the original
    finally:
        # Remove the temp on every exit path that didn't consume it (gs/pikepdf
        # error, no-shrink, or an interrupt mid-run) so it can't linger in docs/.
        # os.replace() above moves it away, so this is a no-op on success.
        if os.path.exists(tmp):
            os.remove(tmp)


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

    if pikepdf is None:
        print(
            "compress_pdfs: WARNING — pikepdf not installed; cannot repair "
            "Ghostscript's empty-ICC colour spaces. The compressed PDFs will "
            "render fine in Acrobat/Chrome but images will be MISSING in Apple "
            "Preview/Safari. Install with: pip install pikepdf"
        )

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
