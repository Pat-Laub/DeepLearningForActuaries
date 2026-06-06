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

Also, from the repository root run:

```shell
quarto install extension andrie/reveal-auto-agenda
```

This is to automatically generate the `agenda` slides inside the reveal.js slides (cf. [that extension's docs](https://github.com/andrie/reveal-auto-agenda#readme)).

You'll also need a few system tools that aren't Python packages: [GraphViz](https://graphviz.org/) (for diagram rendering) and [Ghostscript](https://www.ghostscript.com/) (used by `scripts/compress_pdfs.py` to shrink the slide PDFs; rendering still works without it, but you'll see a "Ghostscript (gs) not found" warning and the PDFs won't be compressed). On macOS with [Homebrew](https://brew.sh/) you can install both via the included `Brewfile`:

```shell
brew bundle
```

On other platforms install them through your package manager, e.g. `apt install graphviz ghostscript`.

Generating the slide PDFs also requires [Node.js](https://nodejs.org/) (which provides `npm`) and the [decktape](https://github.com/astefanutti/decktape) CLI. The `Brewfile` above installs Node; install decktape globally so it's on your `PATH` (`scripts/decktape_pdfs.py` invokes it by name):

```shell
npm install -g decktape
```

This step is only needed when rendering lecture slides — rendering a non-slides page such as `index.qmd` skips it.

To generate the entire website and slides for the whole project, run:

```shell
uv run quarto render
```

For a more targeted render of a specific lecture, run:

```shell
uv run quarto render Lectures/ai-and-deep-learning.qmd
```
