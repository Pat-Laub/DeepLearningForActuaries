import os
import re

# Iterating over files from QUARTO_PROJECT_OUTPUT_FILES environment variable
for file in os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "").split("\n"):
    # If the file is a HTML file and contains both "require.js" and "pyscript.js"
    # then remove the script tags for "require.js".
    if file.endswith(".html"):
        with open(file, "r") as f:
            contents = f.read()
        
        if "require.js" in contents and "pyscript.js" in contents:

            # Remove the script tags for "require.js"
            contents = re.sub(r'<script src="[^"]*require\.min\.js"[^>]*?></script>', "", contents)

            with open(file, "w") as f:
                f.write(contents)
     