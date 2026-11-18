import pathlib
root = pathlib.Path('.')
needle = 'direcion'
ignore = {'node_modules', 'dist', 'web-dist', '.expo'}
for path in root.rglob('*'):
    if path.is_dir():
        continue
    if any(part in ignore for part in path.parts):
        continue
    if path == pathlib.Path('temp_search.py'):
        continue
    if path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.lock', '.woff', '.ttf', '.ico', '.exe', '.dll'}:
        continue
    try:
        text = path.read_text(errors='ignore')
    except Exception:
        continue
    if needle.lower() in text.lower():
        print(path)
