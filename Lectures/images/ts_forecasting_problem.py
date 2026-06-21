import matplotlib.pyplot as plt
import numpy as np

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Helvetica Neue', 'Helvetica', 'Arial', 'DejaVu Sans'],
    'mathtext.default': 'regular',
})

HIST_C = '#3B82F6'
PRED_C = '#F97316'
TRUE_C = '#CBD5E1'
NOW_C  = '#6B7280'
TEXT_C = '#111827'

np.random.seed(7)
T = 18   # history length — few enough to see individual points
H = 7    # forecast horizon

t_all = np.arange(T + H)
ts = (1.6 * np.sin(t_all * 0.38)
      + 0.5 * np.cos(t_all * 0.70 + 1.1)
      + np.cumsum(np.random.randn(T + H) * 0.05))
ts = (ts - ts.mean()) / ts.std() * 0.82

ts_hist = ts[:T]
ts_true = ts[T:]

np.random.seed(13)
drift = np.cumsum(np.random.randn(H) * 0.05)
ts_pred = ts_true + drift   # imperfect forecast

x_hist = np.arange(T)
x_fore = np.arange(T, T + H)

# Confidence half-widths (widening with horizon)
sigma = 0.14 * np.sqrt(np.arange(1, H + 1))

# Y range
y_all = np.concatenate([ts_hist, ts_true, ts_pred + 1.64 * sigma, ts_pred - 1.64 * sigma])
y_data_min, y_data_max = y_all.min(), y_all.max()
ymax  = y_data_max + 0.65
yann  = y_data_min - 0.20   # t / t+1 / t+h tick labels
ybrk  = y_data_min - 0.42   # horizon bracket
ymin  = y_data_min - 0.68   # axes bottom

t_now = T - 0.5


def style_ax(ax):
    ax.set_facecolor('white')
    ax.set_ylim(ymin, ymax)
    ax.set_xlim(-1.5, T + H + 0.5)
    ax.set_yticks([])
    ax.set_xticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)


def draw_base(ax):
    # Region shading
    ax.axvspan(-1.5, t_now,       alpha=0.07, color=HIST_C, zorder=0, lw=0)
    ax.axvspan(t_now, T + H + 0.5, alpha=0.04, color=TRUE_C, zorder=0, lw=0)

    # Subtle time-axis with a tick at every integer position
    ax.axhline(y=ymin + 0.04, color='#D1D5DB', lw=0.9, zorder=1,
               xmin=0.02, xmax=0.98)
    for xi in x_hist:
        ax.plot([xi, xi], [ymin + 0.04, ymin + 0.10],
                color='#94A3B8', lw=0.9, zorder=1)
    for xi in x_fore:
        ax.plot([xi, xi], [ymin + 0.04, ymin + 0.10],
                color='#CBD5E1', lw=0.9, zorder=1)

    # True (unknown) future — faint dots only (no line: they're unobserved)
    ax.scatter(x_fore, ts_true, color=TRUE_C, s=38, zorder=2,
               edgecolors='white', linewidth=1.2)

    # History: thin line + filled dots
    ax.plot(x_hist, ts_hist, color=HIST_C, lw=1.5, alpha=0.55, zorder=3)
    ax.scatter(x_hist, ts_hist, color=HIST_C, s=52, zorder=4,
               edgecolors='white', linewidth=1.6)

    # "Now" dashed line
    ax.axvline(x=t_now, color=NOW_C, lw=1.4,
               linestyle=(0, (6, 3)), zorder=5, alpha=0.85)

    # Text labels
    ax.text(T * 0.42, ymax - 0.06, 'Observed history',
            ha='center', va='top', fontsize=11, color=HIST_C, alpha=0.9, clip_on=False)
    ax.text(t_now + 0.4, ymax - 0.06, 'now',
            ha='left', va='top', fontsize=10, color=NOW_C, style='italic', clip_on=False)


fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.4),
                                facecolor='white', sharey=True)

# ─────────────────────────────────────────────
# Left: h = 1
# ─────────────────────────────────────────────
style_ax(ax1)
draw_base(ax1)
ax1.set_title('One-step ahead  $(h = 1)$', fontsize=14, fontweight='bold',
              color=TEXT_C, pad=14)

# Connector from last observed to single prediction
ax1.plot([T - 1, T], [ts_hist[-1], ts_pred[0]],
         color=PRED_C, lw=1.6, linestyle='--', zorder=6, dash_capstyle='round')
ax1.scatter([T], [ts_pred[0]], color=PRED_C, s=130, zorder=8,
            edgecolors='white', linewidth=2.2)

ax1.text(T+0.5, yann, '$t{+}1$', ha='center', va='top',
         fontsize=13, color=PRED_C, clip_on=False)
ax1.annotate('Forecast',
             xy=(T, ts_pred[0]),
             xytext=(T + 2.8, ts_pred[0] + 0.32),
             fontsize=11, color=PRED_C, va='center',
             arrowprops=dict(arrowstyle='->', color=PRED_C, lw=1.4),
             clip_on=False)

# ─────────────────────────────────────────────
# Right: h > 1
# ─────────────────────────────────────────────
style_ax(ax2)
draw_base(ax2)
ax2.set_title('Multi-step horizon  $(h > 1)$', fontsize=14, fontweight='bold',
              color=TEXT_C, pad=14)

# Forecast: dashed connector + dots at each step
ax2.plot([T - 1] + list(x_fore), [ts_hist[-1]] + list(ts_pred),
         color=PRED_C, lw=1.6, linestyle='--', zorder=5, dash_capstyle='round')
ax2.scatter(x_fore, ts_pred, color=PRED_C, s=75, zorder=7,
            edgecolors='white', linewidth=1.8)

ax2.text(T + H - 0.5, yann, '$t{+}h$', ha='center', va='top',
         fontsize=13, color=PRED_C, clip_on=False)

# Horizon bracket
ax2.annotate('', xy=(T + H - 1, ybrk), xytext=(T, ybrk),
             arrowprops=dict(arrowstyle='<->', color=PRED_C, lw=1.4),
             clip_on=False)
ax2.text((2 * T + H - 1) / 2, ybrk + 0.4, '$h$ steps',
         ha='center', va='top', fontsize=12, color=PRED_C, clip_on=False)

# "Forecast" label
mid = H // 2
ax2.annotate('Forecast',
             xy=(x_fore[mid], ts_pred[mid] + 1.64 * sigma[mid] - 0.4),
             xytext=(x_fore[mid], ymax - 0.50),
             fontsize=11, color=PRED_C, ha='center',
             arrowprops=dict(arrowstyle='->', color=PRED_C, lw=1.4),
             clip_on=False)

plt.tight_layout(pad=2.0)
plt.savefig('ts_forecasting_problem.png', dpi=300, bbox_inches='tight',
            facecolor='white')
print("Saved.")
