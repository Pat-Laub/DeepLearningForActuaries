import matplotlib as mpl
import matplotlib.pyplot as plt
import cycler

# from pyodide import create_proxy
from js import document
from pyodide.ffi.wrappers import add_event_listener #.create_proxy
import numpy as np

mpl.rcParams['axes.spines.right'] = False
mpl.rcParams['axes.spines.top'] = False

colors = ["#91CCCC", "#FF8FA9", "#CC91BC", "#3F9999", "#A5FFB8"]
plt.rcParams["axes.prop_cycle"] = cycler.cycler(color=colors)

plt.rcParams['figure.figsize'] = (5.0, 2.0)
plt.rcParams['figure.dpi'] = 350
plt.rcParams['savefig.bbox'] = "tight"
plt.rcParams['font.family'] = "serif"

f = lambda x: (1/100)**2 * (x**2) * np.sin(x/5)
fDash = lambda x: 2 * (1/100)**2 *(x/100) * np.sin(x/5) + (1/5) * (x/100)**2 * np.cos(x/5)

xRange = (0, 100)
xGrid = np.linspace(xRange[0], xRange[1], 200)
yGrid = f(xGrid)

xs = []
ys = []
yDashs = []

eps = 5

showDerivs = False
showFunction = False
tentativeGuess = None

def new_guess(x):
    xs.append(x)
    ys.append(f(x))
    yDashs.append(fDash(x))    

new_guess(50)

def _make_a_guess(*args):
    global tentativeGuess
    tentativeGuess = None
    sliderGuess = float(document.getElementById("new_guess").value)
    new_guess(sliderGuess)
    redraw()

def _tentative_guess(*args):
    global tentativeGuess
    tentativeGuess = float(document.getElementById("new_guess").value)
    redraw()


def redraw():
    plt.clf()
    plt.figure(2)
    plt.scatter(xs, ys)

    if showFunction:
        plt.plot(xGrid, yGrid, "--")
    
    if showDerivs:
        for i in range(len(xs)):
            plt.plot([xs[i]-eps/2, xs[i]+eps/2], [ys[i]-yDashs[i]*eps/2, ys[i]+yDashs[i]*eps/2], "--", c="#FF8FA9")
    
    if tentativeGuess:
        # plt.scatter(tentativeGuess, 0, color="red")
        plt.axvline(tentativeGuess, color="black", ls="--")

    # Pyscript.write apparently deprecated & will be removed at some point..
    # Check: https://jeff.glass/post/whats-new-pyscript-2022-09-1/
    pyscript.write("mpl", plt.gcf())
    # document.; 


def show_derivatives(*args):
    global showDerivs
    showDerivs = not showDerivs
    redraw()

def reveal_function(*args):
    global showFunction
    showFunction = not showFunction
    redraw()

# make_a_guess = create_proxy(_make_a_guess)
# tentative_guess = create_proxy(_tentative_guess)
add_event_listener(document.getElementById("new_guess"), "input", _tentative_guess)
add_event_listener(document.getElementById("new_guess"), "change", _make_a_guess)
# document.getElementById("new_guess").addEventListener("input", tentative_guess)
# document.getElementById("new_guess").addEventListener("change", make_a_guess)

redraw()