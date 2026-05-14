# Deep Learning for Actuaries

This repository hosts the lecture materials for my "AI & Deep Learning for Actuaries" courses (coded ACTL3143 & ACTL5111) at UNSW.
Go to [the main website](https://pat-laub.github.io/DeepLearningForActuaries/) to view the generated website and slides.

To render these slides yourself, you'll need [Quarto](https://quarto.org) and Python (e.g. the [Anaconda](https://www.anaconda.com/download) installation, or similar).

Firstly, create a Python environment with all the packages from `scripts/requirements.in` installed.
From the repository root, create the environment and install the Python dependencies from `scripts/requirements.in`:

```shell
uv venv --python 3.13
source .venv/bin/activate
uv pip install -r scripts/requirements.in
```

If you prefer not to activate the environment in your shell, you can still run commands through it with `uv run ...`.

Also, from the repository root run:

```shell
quarto install extension andrie/reveal-auto-agenda
```

This is to automatically generate the `agenda` slides inside the reveal.js slides (cf. [that extension's docs](https://github.com/andrie/reveal-auto-agenda#readme)).

Other system dependencies include having GraphViz installed.

To generate the entire website and slides for the whole project, run:

```shell
uv run quarto render
```

For a more targeted render of a specific lecture, run:

```shell
uv run quarto render Lectures/ai-and-deep-learning.qmd
```
