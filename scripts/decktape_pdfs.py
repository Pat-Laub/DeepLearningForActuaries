import os
import subprocess
import re
import shlex

def decktape(file, output, args=None, docker=False, version='', open=False):
    if args is None:
        args = ['--chrome-arg=--allow-file-access-from-files', '-p', '1', '-s', '1280x720', '--chrome-arg=--no-sandbox', '--fragments=false']
    
    args = args + [file, output]
    # args = [shlex.quote(arg) for arg in args]  # Ensuring arguments are safely quoted
    
    if docker:
        # If Docker is used, this part of the code would be uncommented and adapted
        # command = ['docker', 'run', '--rm', '-t', '-v', '`pwd`:/slides', '-v', f'$HOME:$HOME',
        #            f'astefanutti/decktape{(":" + version) if version else ""}', *args]
        pass
    else:
        if os.name == 'nt':  # Windows
            command = ['decktape.cmd', 'reveal', *args]
        else:
            command = ['decktape', 'reveal', *args]
    
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        raise Exception(f'Failed to convert {file} to PDF')
    
    if open:
        # For cross-platform file opening, adapt as needed based on the user's OS
        if os.name == 'nt':  # Windows
            os.startfile(output)
        elif os.name == 'posix':  # macOS, Linux, Unix, etc.
            subprocess.run(['open', output] if os.uname().sysname == 'Darwin' else ['xdg-open', output])

    return output

# Iterating over files from QUARTO_PROJECT_OUTPUT_FILES environment variable
for file in os.getenv("QUARTO_PROJECT_OUTPUT_FILES", "").split("\n"):
    # If the file ends with .slides.html, convert it to PDF
    if re.search(r"\.slides\.html$", file):
        pdf_file = re.sub(r"\.slides\.html$", ".pdf", file)
        
        print(file)
        print(pdf_file)
        
        # Convert to PDF
        decktape(file, pdf_file)
