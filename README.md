# Deep Learning for Actuaries

This repository hosts the lecture materials for my "AI & Deep Learning for Actuaries" courses (coded ACTL3143 & ACTL5111) at UNSW.
Go to [the main website](https://pat-laub.github.io/DeepLearningForActuaries/) to view the generated website and slides.

To render these slides yourself, you'll need [Quarto](https://quarto.org) and Python (e.g. the [Anaconda](https://www.anaconda.com/download) installation, or similar).

Firstly, create a Python environment with all the packages from `scripts/requirements.in` installed.
E.g. with `conda` you can run:

```shell
conda create -n ai python=3.11
conda activate ai
pip install -r scripts/requirements.in
```

To generate the entire website and slides for the whole project, just run

```shell
quarto render
```

or more targeted versions for specific lectures, like

```shell
quarto render Lecture-1-Artificial-Intelligence/artificial-intelligence.qmd
```
