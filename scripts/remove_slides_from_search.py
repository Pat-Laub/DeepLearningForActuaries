#!/usr/bin/env python3
"""
Remove RevealJS slide pages from Quarto's website search index.

The website publishes both reading pages (<name>.html) and slide decks
(<name>.slides.html). Quarto indexes both by default, which means the site search
can send students into a slide deck instead of the main HTML lecture page. This
post-render step keeps the slides available through "Other Formats" links while
removing them from the global search bar.

Usage (manual):
    python scripts/remove_slides_from_search.py
"""

import json
from pathlib import Path

SEARCH_INDEX = Path("docs/search.json")


def is_slide_entry(entry: dict) -> bool:
    """Return True when a search entry points at a RevealJS slide deck."""
    href = str(entry.get("href", ""))
    object_id = str(entry.get("objectID", ""))
    return ".slides.html" in href or ".slides.html" in object_id


def main() -> None:
    if not SEARCH_INDEX.exists():
        print(f"Search index not found: {SEARCH_INDEX}")
        return

    entries = json.loads(SEARCH_INDEX.read_text(encoding="utf-8"))
    filtered = [entry for entry in entries if not is_slide_entry(entry)]
    removed = len(entries) - len(filtered)

    if removed:
        SEARCH_INDEX.write_text(
            json.dumps(filtered, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Removed {removed} slide search entries from {SEARCH_INDEX}")


if __name__ == "__main__":
    main()
