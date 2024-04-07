#!/bin/bash

quarto render Lecture-1-Artificial-Intelligence/course-overview.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/artificial-intelligence.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/python.qmd --no-execute-daemon
(exit) && quarto render Lecture-2-Deep-Learning-Keras/deep-learning-keras.qmd --no-execute-daemon
(exit) && quarto render Lecture-3-Tabular-Data/categorical-variables.qmd --no-execute-daemon
(exit) && quarto render Lecture-3-Tabular-Data/classification.qmd --no-execute-daemon
(exit) && quarto render Lecture-4-Computer-Vision/computer-vision.qmd --no-execute-daemon
(exit) && quarto render Lecture-5-Natural-Language-Processing/natural-language-processing.qmd --no-execute-daemon
(exit) && quarto render Lecture-6-Uncertainty-Quantification/uncertainty-quantification.qmd --no-execute-daemon
(exit) && quarto render Lecture-7-Recurrent-Neural-Networks-And-Time-Series/rnns-and-time-series.qmd --no-execute-daemon
(exit) && quarto render Lecture-8-Generative-Networks/generative-networks.qmd --no-execute-daemon
(exit) && quarto render Lecture-8-Generative-Networks/gans.qmd --no-execute-daemon
(exit) && quarto render Lecture-9-Advanced-Topics/interpretability.qmd --no-execute-daemon
(exit) && quarto render Lecture-9-Advanced-Topics/exam-revision.qmd --no-execute-daemon
(exit) && quarto render index.qmd --no-execute-daemon
