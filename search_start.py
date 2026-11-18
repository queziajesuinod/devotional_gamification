import pathlib
needle = 'start'
root = pathlib.Path('.')
ignore = {'node_modules','dist','web-dist','.expo'}
matches = []
for path in root.rglob('*'):
    if path.is_dir():
        continue
    if any(part in ignore for part in path.parts):
        continue
    if path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.lock', '.woff', '.ttf', '.ico', '.exe', '.dll'}:
        continue
    try:
        data = path.read_text(encoding='utf-8', errors='ignore').lower()
    except Exception:
        continue
    if needle in data:
        matches.append(path)
print(len(matches))
for path in matches[:20]:
    print(path)
