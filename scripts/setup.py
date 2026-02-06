"""
Common setup code for all lecture notebooks.

Usage in the hidden setup cell of each .qmd file:
    import sys
    sys.path.insert(0, "../scripts")
    from setup import *
"""

# Load environment variables first (before importing torch/keras)
from dotenv import find_dotenv, load_dotenv

assert load_dotenv(find_dotenv(usecwd=False)), "The .env file was not loaded."

# Force PyTorch to use CPU instead of MPS (Mac GPU) or CUDA
# This must happen BEFORE importing Keras, which checks for available devices
import torch

torch.backends.mps.is_available = lambda: False
torch.backends.mps.is_built = lambda: False

# Matplotlib configuration
import cycler
import matplotlib
import matplotlib.pyplot as plt

COLOURS = ["#91CCCC", "#FF8FA9", "#CC91BC", "#3F9999", "#A5FFB8"]
plt.rcParams["axes.prop_cycle"] = cycler.cycler(color=COLOURS)
plt.rcParams["figure.dpi"] = 350
plt.rcParams["savefig.bbox"] = "tight"
plt.rcParams["font.family"] = "serif"
plt.rcParams["axes.spines.right"] = False
plt.rcParams["axes.spines.top"] = False


def set_square_figures():
    plt.rcParams["figure.figsize"] = (2.0, 2.0)


def set_rectangular_figures():
    plt.rcParams["figure.figsize"] = (5.0, 2.0)


set_rectangular_figures()


def square_fig():
    return plt.figure(figsize=(2, 2), dpi=350).gca()


def add_diagonal_line():
    xl = plt.xlim()
    yl = plt.ylim()
    shortest_side = min(xl[1], yl[1])
    plt.plot([0, shortest_side], [0, shortest_side], color="black", linestyle="--")


# Pandas configuration
import pandas

pandas.options.display.max_rows = 6

# Numpy configuration
import numpy

numpy.set_printoptions(precision=2)
numpy.random.seed(123)

# Keras configuration
import keras

keras.utils.set_random_seed(1)

# Random seed
import random

random.seed(1234)
