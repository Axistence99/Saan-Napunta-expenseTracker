"""Generate the standalone HTML used by the sandbox and static preview.

Source files stay separate for debugging:
  web/index.template.html
  web/css/styles.css
  web/js/sync.js
  web/js/app.js

The generated web/index.html inlines CSS and JavaScript because the sandbox
file viewer does not load external stylesheets or scripts.
"""

from pathlib import Path

# Resolve paths from this script so the command works from any current directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB = PROJECT_ROOT / "web"

# Read the authoritative split sources. index.html is generated and should not be edited.
html = (WEB / "index.template.html").read_text(encoding="utf-8")
css = (WEB / "css" / "styles.css").read_text(encoding="utf-8")
sync = (WEB / "js" / "sync.js").read_text(encoding="utf-8")
js = (WEB / "js" / "app.js").read_text(encoding="utf-8")

# Replace external CSS with one inline style block for the sandboxed file viewer.
html = html.replace(
    '  <link rel="stylesheet" href="css/styles.css" />',
    f"  <style>\n{css}\n  </style>",
)
# Preserve script order: the optional sync API must exist before app.js wires it.
html = html.replace(
    '  <script src="js/sync.js"></script>\n  <script src="js/app.js"></script>',
    f"  <script>\n{sync}\n  </script>\n  <script>\n{js}\n  </script>",
)

# Commit this standalone artifact because GitHub Pages publishes the web directory directly.
(WEB / "index.html").write_text(html, encoding="utf-8")
print("Generated web/index.html from the source files.")
