import marimo

__generated_with = "0.14.10"
app = marimo.App(width="medium")


@app.cell
def __():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    import pandas as pd
    return mo, np, plt, Rectangle, pd


@app.cell
def __(mo):
    mo.md(
        r"""
        # Function Minimisation and Gradient Visualization Demo

        This interactive demo visualizes how derivatives (gradients) guide the process of finding minimum values of a function. 
        Explore how the slope at each point indicates the direction to move for optimization.
        """
    )
    return


@app.cell
def __(mo):
    # UI Controls
    x_slider = mo.ui.slider(
        start=-10, 
        stop=10, 
        step=0.1, 
        value=0,
        label="Select x-value to evaluate:"
    )
    
    add_point_button = mo.ui.button(
        label="Add Point at Current x-value",
        value=0,
        on_click=lambda count: count + 1
    )
    
    show_derivatives = mo.ui.checkbox(
        value=False,
        label="Show Derivatives (tangent lines)"
    )
    
    reveal_function = mo.ui.checkbox(
        value=False,
        label="Reveal Complete Function"
    )
    
    reset_button = mo.ui.button(
        label="Reset Points",
        value=0,
        on_click=lambda count: count + 1
    )
    
    return x_slider, add_point_button, show_derivatives, reveal_function, reset_button


@app.cell
def __(mo, x_slider, add_point_button, show_derivatives, reveal_function, reset_button):
    # Display controls - all in one row
    mo.hstack([
        x_slider,
        add_point_button,
        show_derivatives,
        reveal_function,
        reset_button
    ])
    return


@app.cell
def __(np):
    # Mathematical function: scaled sine wave with quadratic growth
    def f(x):
        return 0.1 * x**2 + 2 * np.sin(x) + 5
    
    def df_dx(x):
        """Derivative of the function"""
        return 0.2 * x + 2 * np.cos(x)
    
    return f, df_dx


@app.cell
def __(reset_button, add_point_button, np):
    # Remove this duplicate cell - not needed
    pass


@app.cell
def __(add_point_button, reset_button, x_slider, np):
    # Use a more explicit state management approach
    current_x = x_slider.value
    tolerance = 0.05
    
    # Initialize points list
    if not hasattr(add_point_button, '_points_list'):
        add_point_button._points_list = []
        add_point_button._last_add_count = 0
        add_point_button._last_reset_count = 0
    
    # Handle reset
    if reset_button.value > add_point_button._last_reset_count:
        add_point_button._points_list = []
        add_point_button._last_reset_count = reset_button.value
        add_point_button._last_add_count = add_point_button.value
    
    # Handle adding new points
    if add_point_button.value > add_point_button._last_add_count:
        # New point was added
        if not add_point_button._points_list or not np.any(np.abs(np.array(add_point_button._points_list) - current_x) < tolerance):
            add_point_button._points_list.append(current_x)
        add_point_button._last_add_count = add_point_button.value
    
    evaluated_points_updated = np.array(add_point_button._points_list)
    
    return evaluated_points_updated, current_x, tolerance


@app.cell
def __(evaluated_points_updated, f, df_dx, np):
    # Calculate function values and derivatives for all evaluated points
    if len(evaluated_points_updated) > 0:
        y_values = f(evaluated_points_updated)
        derivatives = df_dx(evaluated_points_updated)
    else:
        y_values = np.array([])
        derivatives = np.array([])
    
    return y_values, derivatives


@app.cell
def __(plt, np, f, evaluated_points_updated, y_values, derivatives, show_derivatives, reveal_function, current_x):
    # Create the main visualization
    fig, ax = plt.subplots(figsize=(8, 3), dpi=250)
    
    # Plot the complete function if revealed
    if reveal_function.value:
        x_full = np.linspace(-10, 10, 1000)
        y_full = f(x_full)
        ax.plot(x_full, y_full, '--', color='gray', alpha=0.7, linewidth=2, label='Complete Function')
    
    # Plot evaluated points (only if there are any)
    if len(evaluated_points_updated) > 0:
        ax.scatter(evaluated_points_updated, y_values, color='red', s=100, zorder=5, label='Evaluated Points')
        
        # Show derivatives as tangent lines if enabled
        if show_derivatives.value:
            for i, (x_pt, y_pt, slope) in enumerate(zip(evaluated_points_updated, y_values, derivatives)):
                # Create tangent line segment
                dx = 0.8  # length of tangent line segment
                x_tangent = np.array([x_pt - dx, x_pt + dx])
                y_tangent = y_pt + slope * (x_tangent - x_pt)
                
                color = 'blue' if slope < 0 else 'orange'
                ax.plot(x_tangent, y_tangent, color=color, linewidth=2, alpha=0.8)
                
                # Add arrow to show direction
                arrow_x = x_pt + (dx * 0.7 * (-1 if slope < 0 else 1))
                arrow_y = y_pt + slope * (arrow_x - x_pt)
                dx_arrow = dx * 0.2 * (-1 if slope < 0 else 1)
                dy_arrow = slope * dx_arrow
                
                ax.arrow(arrow_x, arrow_y, dx_arrow, dy_arrow, 
                        head_width=0.2, head_length=0.1, fc=color, ec=color)
    
    # Always show preview vertical line at current slider position
    ax.axvline(x=current_x, color='green', linestyle=':', alpha=0.6, linewidth=2, label='Current x-value')
    
    # Formatting
    ax.set_xlabel('x', fontsize=12)
    ax.set_ylabel('f(x)', fontsize=12)
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    # Set reasonable axis limits
    ax.set_xlim(-10, 10)
    if len(y_values) > 0:
        y_min, y_max = min(y_values) - 2, max(y_values) + 2
    else:
        y_min, y_max = 0, 10
    ax.set_ylim(y_min, y_max)
    
    plt.tight_layout()
    fig
    return fig, ax


@app.cell
def __(mo, evaluated_points_updated, y_values, derivatives, current_x):
    # Information panel
    if len(evaluated_points_updated) > 0:
        info_md = f"""
        ## Current Status
        
        **Number of evaluated points:** {len(evaluated_points_updated)}
        
        **Current slider position:** x = {current_x:.2f}
        
        **Latest evaluated point:** x = {evaluated_points_updated[-1]:.2f}, f(x) = {y_values[-1]:.2f}
        
        **Derivative at latest point:** f'(x) = {derivatives[-1]:.2f}
        """
        
        # Only show direction hint for the latest evaluated point
        if derivatives[-1] < -0.1:
            direction_hint = "🡸 **Gradient suggests moving LEFT for lower values**"
        elif derivatives[-1] > 0.1:
            direction_hint = "🡺 **Gradient suggests moving RIGHT for lower values**"
        else:
            direction_hint = "🎯 **Near a critical point! (slope ≈ 0)**"
        
        mo.md(info_md + "\n\n" + direction_hint)
    else:
        mo.md(f"""
        ## Current Status
        
        **Number of evaluated points:** 0
        
        **Current slider position:** x = {current_x:.2f}
        
        💡 **Move the slider to explore x-values, then click "Add Point" to evaluate the function at that location!**
        """)
    return

if __name__ == "__main__":
    app.run()

