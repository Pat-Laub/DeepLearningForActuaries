# Print Media

This Quarto filter replaces selected RevealJS content with an author-supplied
image when the deck is opened with `?print-pdf` or `?view=print`. It uses only
Quarto's bundled Lua runtime plus browser JavaScript and CSS.

## Images, GIFs, and image-style videos

Add `print-src` to the existing image:

```markdown
![](animation.gif){print-src="images/animation-print.png"}
```

The original remains visible in the live deck. The supplied image appears in
print mode and retains the original element's size, position, and classes.

For zero-QMD-change replacements, place a sidecar beside the original:

```text
images/animation.gif
images/animation.print.png
```

Supported sidecars, in priority order, are `.print.png`, `.print.jpg`,
`.print.jpeg`, `.print.webp`, and `.print.svg`. Explicit `print-src` wins. Use
`print-replace="false"` to ignore a sidecar for one element.

## Arbitrary block content

Wrap a video shortcode, iframe, Plotly output, or custom component:

```markdown
::: {print-src="images/demo-print.png" print-alt="Static view of the demo"}
{{< video images/demo.mp4 >}}
:::
```

The wrapper's complete contents are replaced in print mode. The same attribute
also works on an inline span.

YouTube iframes are handled automatically with YouTube's remote thumbnail and
remain linked to the original video. No Python, ffmpeg, Node.js, media decoder,
or build-time network request is required.
