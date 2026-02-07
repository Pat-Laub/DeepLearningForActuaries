"""
Common setup code for all lecture notebooks.

Usage in the hidden setup cell of each .qmd file:
    import sys
    sys.path.insert(0, "../scripts")
    from setup import *
"""

# Set environment variables (replaces .env file)
import os

# Use PyTorch backend for Keras
os.environ['KERAS_BACKEND'] = 'torch'

# Disable CUDA (use CPU only)
os.environ['CUDA_VISIBLE_DEVICES'] = ''

# Deterministic Quarto rendering (Deno seed)
os.environ['QUARTO_DENO_EXTRA_OPTIONS'] = '--seed=2026'

# Deterministic Python hashing
os.environ['PYTHONHASHSEED'] = '0'

# Force PyTorch to use CPU instead of MPS (Mac GPU) or CUDA
# This must happen BEFORE importing Keras, which checks for available devices
import torch

torch.backends.mps.is_available = lambda: False
torch.backends.mps.is_built = lambda: False

# Set PyTorch to deterministic mode for reproducible builds
torch.manual_seed(42)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False
try:
    torch.use_deterministic_algorithms(True)
except Exception:
    # Some PyTorch versions don't support this
    pass

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
