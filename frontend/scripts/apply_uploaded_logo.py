from pathlib import Path
from PIL import Image

src = Path(r'C:\Users\it\AppData\Local\Temp\c44d3612-d569-45a4-9aeb-590dd19a02b1.tmp.png')
assets = Path('assets/images')
assets.mkdir(parents=True, exist_ok=True)
dest = assets / 'icon.png'
adaptive = assets / 'adaptive-icon.png'
with Image.open(src) as im:
    im = im.convert('RGBA')
    im = im.resize((1024, 1024), Image.LANCZOS)
    im.save(dest)
    im.save(adaptive)
print(f'Copied exact logo to {dest} and {adaptive}')
