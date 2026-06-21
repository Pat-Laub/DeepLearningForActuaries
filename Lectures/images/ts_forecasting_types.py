import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.lines import Line2D
import numpy as np

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Helvetica Neue', 'Helvetica', 'Arial', 'DejaVu Sans'],
})

COLORS = {'A': '#3B82F6', 'B': '#22C55E', 'C': '#F97316'}
MODEL_COLOR = '#1E293B'
ARROW_COLOR = '#64748B'
N, PAST = 60, 40

def make_series():
    series = {}
    params = {'A': (0, 0.9, 0.0), 'B': (3, 1.3, 1.0), 'C': (7, 0.6, 2.2)}
    for k, (seed, freq, phase) in params.items():
        rng = np.random.RandomState(seed)
        t = np.linspace(0, 4 * np.pi, N)
        ts = np.sin(t * freq + phase) + rng.randn(N) * 0.1 + np.cumsum(rng.randn(N) * 0.012)
        series[k] = ts
    return series

TS = make_series()

def normalize(ts, lo=0.12, hi=0.88):
    mn, mx = ts.min(), ts.max()
    return lo + (hi - lo) * (ts - mn) / (mx - mn + 1e-9)

def y_positions(n):
    return {1: [0.52], 3: [0.77, 0.52, 0.27]}[n]

def box_height(n):
    return {1: 0.30, 3: 0.19}[n]

BOX_W = 0.27
MODEL_W, MODEL_H = 0.11, 0.17
IN_CX, OUT_CX, MODEL_CX = 0.20, 0.80, 0.50
MODEL_CY = 0.52

SCENARIOS = [
    {'inputs': ['A'], 'outputs': ['A'],
     'title': 'Local univariate model'},
    {'inputs': ['A', 'B', 'C'], 'outputs': ['A'],
     'title': 'Global univariate model'},
    {'inputs': ['A', 'B', 'C'], 'outputs': ['A', 'B', 'C'],
     'title': 'Multivariate model'},
]

fig, axes = plt.subplots(1, 3, figsize=(15, 5.2))
fig.patch.set_facecolor('white')


def draw_box(ax, cx, cy, bw, bh, key, is_output):
    color = COLORS[key]
    bx, by = cx - bw / 2, cy - bh / 2

    # Drop shadow
    ax.add_patch(FancyBboxPatch(
        (bx + 0.004, by - 0.004), bw, bh,
        boxstyle='round,pad=0.015',
        facecolor='#94A3B8', edgecolor='none', alpha=0.28, zorder=2))

    ax.add_patch(FancyBboxPatch(
        (bx, by), bw, bh,
        boxstyle='round,pad=0.015',
        facecolor='white', edgecolor=color, linewidth=2.2, zorder=3))

    ts = normalize(TS[key])
    xs = np.linspace(bx + 0.07 * bw, bx + 0.93 * bw, N)
    ys = by + ts * bh
    split_x = xs[PAST]

    if is_output:
        ax.plot(xs[:PAST + 1], ys[:PAST + 1], color=color, lw=1.2, alpha=0.15, zorder=5)
        ax.plot(xs[PAST:], ys[PAST:], color=color, lw=2.1, alpha=1.0, zorder=5,
                linestyle=(0, (5, 2)))
    else:
        ax.plot(xs[:PAST], ys[:PAST], color=color, lw=2.1, alpha=1.0, zorder=5)
        ax.plot(xs[PAST:], ys[PAST:], color=color, lw=1.2, alpha=0.15, zorder=5)

    ax.plot([split_x, split_x], [by + 0.08 * bh, by + 0.92 * bh],
            color='#CBD5E1', lw=0.9, linestyle=':', zorder=6)

    ax.text(cx, by - 0.028, f'Series {key}',
            ha='center', va='top', fontsize=9.5, color=color, fontweight='bold', zorder=6)


def draw_model(ax, cx, cy):
    bx, by = cx - MODEL_W / 2, cy - MODEL_H / 2
    ax.add_patch(FancyBboxPatch(
        (bx + 0.004, by - 0.004), MODEL_W, MODEL_H,
        boxstyle='round,pad=0.015',
        facecolor='#334155', edgecolor='none', alpha=0.30, zorder=2))
    ax.add_patch(FancyBboxPatch(
        (bx, by), MODEL_W, MODEL_H,
        boxstyle='round,pad=0.015',
        facecolor=MODEL_COLOR, edgecolor='none', zorder=3))
    ax.text(cx, cy, 'Model', ha='center', va='center',
            fontsize=10, color='white', fontweight='bold', zorder=4)


def draw_arrow(ax, x0, y0, x1, y1):
    ax.annotate('', xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(
                    arrowstyle='-|>', color=ARROW_COLOR, lw=1.5,
                    connectionstyle='arc3,rad=0.0', mutation_scale=13),
                zorder=2)


for ax, sc in zip(axes, SCENARIOS):
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.set_title(sc['title'], fontsize=18, fontweight='bold',
                 color='#1E293B', pad=14, loc='center')

    inputs, outputs = sc['inputs'], sc['outputs']
    in_ys = y_positions(len(inputs))
    out_ys = y_positions(len(outputs))
    bh_in = box_height(len(inputs))
    bh_out = box_height(len(outputs))

    for key, cy in zip(inputs, in_ys):
        draw_box(ax, IN_CX, cy, BOX_W, bh_in, key, is_output=False)
        draw_arrow(ax, IN_CX + BOX_W / 2, cy, MODEL_CX - MODEL_W / 2, MODEL_CY)

    draw_model(ax, MODEL_CX, MODEL_CY)

    for key, cy in zip(outputs, out_ys):
        draw_box(ax, OUT_CX, cy, BOX_W, bh_out, key, is_output=True)
        draw_arrow(ax, MODEL_CX + MODEL_W / 2, MODEL_CY, OUT_CX - BOX_W / 2, cy)

# Legend
legend_elems = [
    Line2D([0], [0], color='#64748B', lw=2.2, label='History (observed)'),
    Line2D([0], [0], color='#64748B', lw=2.2, linestyle=(0, (5, 2)), label='Forecast (predicted)'),
]
fig.legend(handles=legend_elems, loc='lower center', ncol=2, fontsize=10.5,
           frameon=False, bbox_to_anchor=(0.5, -0.01), labelcolor='#1E293B')

plt.tight_layout(pad=1.5, rect=[0, 0.06, 1, 1])
plt.savefig('ts_forecasting_types.png', dpi=300, bbox_inches='tight', facecolor='white')
print("Saved.")
