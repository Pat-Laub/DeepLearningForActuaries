# First install the Tensorflow/Keras & other packages.
pip install -r requirements.in
# Then install PyTorch.
pip install -r torch_requirements.in
# But lastly revert the CUDA library versions to what TensorFlow/Keras uses.
pip install -r requirements.in