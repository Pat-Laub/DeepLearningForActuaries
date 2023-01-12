# Deep Learning for Actuaries
## Lecture slides from UNSW's ACTL3143/5111


### Overview

These are the lecture slides from my recent "Deep Learning for Actuaries" courses (coded ACTL3143 & ACTL5111) at UNSW.
They can be used to see what topics I covered in these courses.
The slides are not intended to be used to learn deep learning from scratch.
For that, you need to attend the lectures & complete the assessment.

### Lecture slides

- Course overview [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-1-Artificial-Intelligence/course-overview.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-1-Artificial-Intelligence/course-overview.qmd)
- Artificial intelligence & machine learning [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-1-Artificial-Intelligence/artificial-intelligence.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-1-Artificial-Intelligence/artificial-intelligence.qmd)
- Python [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-1-Artificial-Intelligence/python.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-1-Artificial-Intelligence/python.qmd)
- Making a chess-playing AI [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-1-Artificial-Intelligence/chess-ai.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-1-Artificial-Intelligence/chess-ai.qmd)
- Deep Learning with Keras [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-2-Deep-Learning-Keras/deep-learning-keras.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-2-Deep-Learning-Keras/deep-learning-keras.qmd)
- Mathematics of Deep Learning [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-3-Mathematics-Of-Deep-Learning/mathematics-of-deep-learning.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-3-Mathematics-Of-Deep-Learning/mathematics-of-deep-learning.qmd)
- Network Architectures for Tabular Data [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-4-Network-Architectures-For-Tabular-Data/network-architectures-for-tabular-data.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-4-Network-Architectures-For-Tabular-Data/network-architectures-for-tabular-data.qmd)
- Recurrent Neural Networks [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-5-Recurrent-Neural-Networks-And-Time-Series/rnns-and-time-series.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-5-Recurrent-Neural-Networks-And-Time-Series/rnns-and-time-series.qmd)
- Computer Vision [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-6-Computer-Vision/computer-vision.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-6-Computer-Vision/computer-vision.qmd)
- Natural Language Processing [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-7-Natural-Language-Processing/natural-language-processing.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-7-Natural-Language-Processing/natural-language-processing.qmd)
- Generative Networks [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-8-Generative-Networks/generative-networks.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-8-Generative-Networks/generative-networks.qmd)
- Advanced Topics & Revision [slides](https://pat-laub.github.io/DeepLearningForActuaries/Lecture-9-Advanced-Topics/advanced-topics.html), [source](http://github.com/Pat-Laub/DeepLearningForActuaries/blob/main/Lecture-9-Advanced-Topics/advanced-topics.qmd)

Note: Some of the figures in these slides are blurred out. That is because their copyright allows for the use within classes, but not for general reproduction/publication, so I have redacted the relevant figures here.

### List of Topics Covered

#### Lecture 1: Artificial Intelligence & Python

- artificial intelligence
- Google Colaboratory
- minimax algorithm
- pseudocode
- Python concepts & syntax
- dictionaries
- f-strings
- function & default arguments
- lists, tuples, `range` & slicing
- whitespace indentation
- zero-indexing

#### Lecture 2: Deep Learning

- activations, activation function
- artificial intelligence vs machine learning
- artificial neural network
- biases (in neurons)
- classification problem
- cost/loss function
- deep network, network depth
- dense or fully-connected layer
- epoch
- feed-forward neural network
- Keras, Tensorflow, PyTorch
- labelled/unlabelled data
- machine learning
- matplotlib, seaborn
- neural network architecture
- perceptron
- ReLU
- representation learning
- sigmoid activation function
- targets
- universal approximation theorem
- weights (in a neuron)

#### Lecture 3: Mathemathics of Deep Learning

- accuracy
- batches, batch size
- callbacks
- cross-entropy loss
- early stopping
- gradient-based learning, hill-climbing
- metrics
- overfitting
- shallow neural network
- stochastic (mini-batch) gradient descent
- training/validation/test split

#### Lecture 4: Tabular Data

- confusion matrix
- dead ReLU neurons
- dropout
- ensemble model
- entity embeddings
- Input layer
- Keras eager execution
- Keras functional API
- $\ell_1$ & $\ell_2$ regularisation
- leaky ReLU
- Monte Carlo dropout
- regularisation
- Reshape layer
- skip connection
- wide & deep network structure

#### Lecture 5: Guest Lecture & Recurrent Neural Networks

- dimensions (tensor)
- GRU
- LSTM
- rank (tensor)
- recurrent neural networks
- SimpleRNN

#### Lecture 6: Convolutional Neural Networks

- channels
- computer vision
- convolutional layer & CNN
- error analysis
- filter
- flatten layer
- kernel
- max pooling
- MNIST
- stride

#### Lecture 7: Natural Language Processing

- AlexNet
- bag of words
- CIFAR-10 / CIFAR-100
- GoogLeNet & Inception
- ImageNet
- fine-tuning
- lemmatization
- one-hot embedding
- transfer learning
- vocabulary

#### Lecture 8: Generative Networks

- autoencoder
- bias
- DeepDream
- greedy sampling
- GloVe
- Grad-CAM
- language model
- latent space
- neural style transfer
- softmax temperature
- stochastic sampling
- word embeddings/vectors
- word2vec

#### Lecture 9

- Dissecting `model.fit` (i.e., making a custom training loop)
- Object oriented programming & PyTorch
- Generative adversarial networks
