"""
Patch an H5 Keras model file to remove the 'groups' key from
DepthwiseConv2D layer configs, which Keras 3 doesn't accept.

Usage:
    python fix_h5_depthwise.py input.h5 [output.h5]

If output is omitted, the input file is modified in-place.
"""

import sys
import json
import shutil
import h5py


def strip_groups_from_depthwise(obj):
    """Recursively find DepthwiseConv2D configs and remove 'groups'."""
    count = 0
    if isinstance(obj, dict):
        if obj.get("class_name") == "DepthwiseConv2D" and "config" in obj:
            if "groups" in obj["config"]:
                del obj["config"]["groups"]
                count += 1
        for v in obj.values():
            count += strip_groups_from_depthwise(v)
    elif isinstance(obj, list):
        for v in obj:
            count += strip_groups_from_depthwise(v)
    return count


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip())
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path

    if output_path != input_path:
        shutil.copy2(input_path, output_path)
        target = output_path
    else:
        target = input_path

    with h5py.File(target, "r+") as f:
        raw = f.attrs.get("model_config")
        if raw is None:
            print("No model_config attribute found in the H5 file.")
            sys.exit(1)

        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")

        config = json.loads(raw)
        n = strip_groups_from_depthwise(config)

        if n == 0:
            print("No DepthwiseConv2D 'groups' keys found. Nothing to fix.")
            return

        f.attrs["model_config"] = json.dumps(config)
        print(f"Removed 'groups' from {n} DepthwiseConv2D layer(s) in {target}")


if __name__ == "__main__":
    main()
