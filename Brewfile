# System (non-Python) dependencies for building this project on macOS.
# Install everything with:  brew bundle
# Check what's missing with: brew bundle check
#
# Note: Quarto and the Python toolchain (uv) are expected to be installed
# separately — see README.md. The decktape CLI is an npm package, not a brew
# formula, so install it with `npm install -g decktape` (Node is installed here).

brew "graphviz"     # diagram rendering
brew "ghostscript"  # PDF compression in scripts/compress_pdfs.py
brew "node"         # provides npm, used to install the decktape CLI for slide PDFs

# A LaTeX distribution is required too. The lightweight cross-platform route is
# `quarto install tinytex` (see README.md). Uncomment the next line instead if
# you want a full TeX install (~5GB); use mactex-no-gui to skip the GUI apps.
# cask "mactex"
