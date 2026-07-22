# Deep Learning for Actuaries

This repository hosts the lecture materials for my "AI & Deep Learning for Actuaries" courses (coded ACTL3143 & ACTL5111) at UNSW.
Go to [the main website](https://pat-laub.github.io/DeepLearningForActuaries/) to view the generated website and slides.

To render these slides yourself, you'll need [Quarto](https://quarto.org) and Python (e.g. the [Anaconda](https://www.anaconda.com/download) installation, or similar).

Firstly, create a Python environment with all the packages from `requirements.in` installed.
From the repository root, create the environment and install the Python dependencies from `requirements.in`:

```shell
uv venv --python 3.13
source .venv/bin/activate
uv pip install -r requirements.in
```

If you prefer not to activate the environment in your shell, you can still run commands through it with `uv run ...`.

The [reveal-auto-agenda](https://github.com/andrie/reveal-auto-agenda#readme) extension (which automatically generates the `agenda` slides inside the reveal.js slides from the header structure) is bundled in `_extensions/`, so there's no install step. To refresh it to the latest upstream version, run `quarto update andrie/reveal-auto-agenda` from the repository root (or `quarto add andrie/reveal-auto-agenda` to re-add it if the folder is ever removed).

You'll also need a few system tools that aren't Python packages: [GraphViz](https://graphviz.org/) (for diagram rendering) and [Ghostscript](https://www.ghostscript.com/) (used by `scripts/compress_pdfs.py` to shrink the slide PDFs; rendering still works without it, but you'll see a "Ghostscript (gs) not found" warning and the PDFs won't be compressed). On macOS with [Homebrew](https://brew.sh/) you can install both via the included `Brewfile`:

```shell
brew bundle
```

On other platforms install them through your package manager, e.g. `apt install graphviz ghostscript`.

A LaTeX/TeX distribution is also required (some figures are built from `.tex` sources and PDF output goes through LaTeX). The recommended option is Quarto's bundled TinyTeX — it's smaller (~200 MB) and auto-installs any extra LaTeX packages on demand:

```shell
quarto install tinytex
```

(If you'd prefer a full TeX installation — e.g. because you use LaTeX outside this project too — a system distribution such as [MacTeX](https://www.tug.org/mactex/) on macOS or `texlive-full` on Debian/Ubuntu works just as well; Quarto uses it automatically once TinyTeX isn't installed. See the commented `cask "mactex"` line in the `Brewfile`.)

To generate the entire website and slides for the whole project, run:

```shell
uv run quarto render
```

For a more targeted render of a specific lecture, run:

```shell
uv run quarto render Lectures/ai-and-deep-learning.qmd
```
