from pathlib import Path
from math import cos, sin, radians
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
assets_dir = root / "assets" / "images"
assets_dir.mkdir(parents=True, exist_ok=True)

size = 1024
bg_color = (0, 0, 0, 255)
icon_path = assets_dir / "icon.png"
adaptive_icon_path = assets_dir / "adaptive-icon.png"

base_color = (196, 35, 255, 255)

rings = [
    {"radius": 340, "width": 95, "start": 50, "end": 310},
    {"radius": 260, "width": 85, "start": 50, "end": 310},
    {"radius": 180, "width": 75, "start": 80, "end": 280},
]


def round_end(draw, cx, cy, r, angle, width, color):
    x = cx + r * cos(radians(angle))
    y = cy + r * sin(radians(angle))
    draw.ellipse(
        [x - width // 2, y - width // 2, x + width // 2, y + width // 2],
        fill=color,
    )


def draw_ring(draw, radius, width, start, end, color):
    for glow in range(18, 0, -1):
        alpha = int(color[3] * (glow / 18) * 0.24)
        glow_width = width + glow * 12
        draw.arc(
            [
                size // 2 - radius - glow,
                size // 2 - radius - glow,
                size // 2 + radius + glow,
                size // 2 + radius + glow,
            ],
            start=start,
            end=end,
            fill=(color[0], color[1], color[2], alpha),
            width=glow_width,
        )
    draw.arc(
        [
            size // 2 - radius,
            size // 2 - radius,
            size // 2 + radius,
            size // 2 + radius,
        ],
        start=start,
        end=end,
        fill=color,
        width=width,
    )
    round_end(draw, size // 2, size // 2, radius, start, width, color)
    round_end(draw, size // 2, size // 2, radius, end, width, color)


def draw_logo(base_img):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for ring in rings:
        draw_ring(draw, ring["radius"], ring["width"], ring["start"], ring["end"], base_color)

    blurred = layer.filter(ImageFilter.GaussianBlur(radius=14))
    base_img.alpha_composite(blurred)
    base_img.alpha_composite(layer)
    return base_img

icon_img = Image.new("RGBA", (size, size), bg_color)
icon_img = draw_logo(icon_img)
icon_img.save(icon_path)

adaptive_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
adaptive_img = draw_logo(adaptive_img)
adaptive_img.save(adaptive_icon_path)

print(f"Saved {icon_path}\nSaved {adaptive_icon_path}")
