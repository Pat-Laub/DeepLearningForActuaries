import matplotlib.pyplot as plt
import cycler

from pyodide import create_proxy
import numpy as np

plt.rcParams['axes.spines.right'] = False
plt.rcParams['axes.spines.top'] = False

colors = ["#91CCCC", "#FF8FA9", "#CC91BC", "#3F9999", "#A5FFB8"]
plt.rcParams["axes.prop_cycle"] = cycler.cycler(color=colors)

plt.rcParams['figure.figsize'] = (3.0, 2.0)
plt.rcParams['figure.dpi'] = 350
plt.rcParams['savefig.bbox'] = "tight"
plt.rcParams['font.family'] = "serif"


bias = 0

def _update_bias(*args):
    global bias
    bias = float(document.getElementById("bias-slider").value) / 100
    redraw()

update_bias = create_proxy(_update_bias)
document.getElementById("bias-slider").addEventListener("input", update_bias)



xs = np.linspace(-10, 10, 1_000)
ys = xs + bias >= 0
    
hl, = plt.plot(xs, ys)
plt.xlim([-5, 5])
plt.xlabel("Weighted Sum Input")
plt.ylabel("Output");

def redraw():
    # Adapted from: https://stackoverflow.com/questions/10944621/dynamically-updating-plot-in-matplotlib
    ys = xs + bias >= 0
    hl.set_ydata(ys)
    plt.draw()

    pyscript.write("mpl", plt.gcf())

redraw()