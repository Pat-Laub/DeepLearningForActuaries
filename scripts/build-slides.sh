#!/bin/bash

quarto render Lecture-1-Artificial-Intelligence/course-overview.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/artificial-intelligence.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/python.qmd --no-execute-daemon
(exit) && quarto render Lecture-1-Artificial-Intelligence/chess-ai.qmd --no-execute-daemon
(exit) && quarto render Lecture-2-Deep-Learning-Keras/deep-learning-keras.qmd --no-execute-daemon
(exit) && quarto render Lecture-3-Mathematics-Of-Deep-Learning/mathematics-of-deep-learning.qmd --no-execute-daemon
(exit) && quarto render Lecture-4-Network-Architectures-For-Tabular-Data/network-architectures-for-tabular-data.qmd --no-execute-daemon
(exit) && quarto render Lecture-5-Recurrent-Neural-Networks-And-Time-Series/rnns-and-time-series.qmd --no-execute-daemon
(exit) && quarto render Lecture-6-Computer-Vision/computer-vision.qmd --no-execute-daemon
(exit) && quarto render Lecture-7-Natural-Language-Processing/natural-language-processing.qmd --no-execute-daemon
(exit) && quarto render Lecture-8-Generative-Networks/generative-networks.qmd --no-execute-daemon
(exit) && quarto render Lecture-9-Advanced-Topics/advanced-topics.qmd --no-execute-daemon
(exit) && quarto render index.qmd --no-execute-daemon
