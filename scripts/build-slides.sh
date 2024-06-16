#!/bin/bash

quarto render index.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/course-overview.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/artificial-intelligence.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/python.qmd --no-execute-daemon
(exit) && quarto render Lecture-2-Deep-Learning-Keras/deep-learning-keras.qmd --no-execute-daemon
(exit) && quarto render Lecture-2-Deep-Learning-Keras/project.qmd --no-execute-daemon
(exit) && quarto render Lecture-3-Tabular-Data/categorical-variables.qmd --no-execute-daemon
(exit) && quarto render Lecture-3-Tabular-Data/classification.qmd --no-execute-daemon
(exit) && quarto render Lecture-4-Computer-Vision/computer-vision.qmd --no-execute-daemon
(exit) && quarto render Lecture-5-Natural-Language-Processing/natural-language-processing.qmd --no-execute-daemon
(exit) && quarto render Lecture-6-Distributional-Regression/optimisation.qmd --no-execute-daemon
(exit) && quarto render Lecture-6-Distributional-Regression/distributional-regression.qmd --no-execute-daemon
(exit) && quarto render Lecture-7-Recurrent-Neural-Networks-And-Time-Series/rnns-and-time-series.qmd --no-execute-daemon
(exit) && quarto render Lecture-8-Generative-Networks/generative-networks.qmd --no-execute-daemon
(exit) && quarto render Lecture-8-Generative-Networks/gans.qmd --no-execute-daemon
(exit) && quarto render Lecture-9-Advanced-Topics/interpretability.qmd --no-execute-daemon
(exit) && quarto render Lecture-9-Advanced-Topics/next-steps.qmd --no-execute-daemon
(exit) && quarto render Labs/python-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/python-for-data-science-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/matplotlib-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/forward-pass-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/latex-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/optimisation-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/backpropagation-lab.qmd --no-execute-daemon
(exit) && quarto render Labs/distributional-regression-lab.qmd --no-execute-daemon
(exit) && quarto render Exercises/chess-ai.qmd --no-execute-daemon
(exit) && quarto render Exercises/victorian-crash-severity.qmd --no-execute-daemon
(exit) && quarto render Exercises/french-motor-frequency.qmd --no-execute-daemon
(exit) && quarto render Exercises/hurricane-damage.qmd --no-execute-daemon
(exit) && quarto render Exercises/police-reports.qmd --no-execute-daemon
(exit) && quarto render Exercises/sydney-airport-temperature.qmd --no-execute-daemon