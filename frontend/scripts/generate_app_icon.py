from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
assets_dir = root / "assets" / "images"
assets_dir.mkdir(parents=True, exist_ok=True)

size = 1024
bg_color = (0, 0, 0, 255)
icon_path = assets_dir / "icon.png"
adaptive_icon_path = assets_dir / "adaptive-icon.png"

# Shared helper for drawing the neon logo

def draw_neon_logo(draw, background, transparent=False):
    color = (181, 63, 255)
    center = size // 2
    thickness = 72
    glow_steps = 12

    # outermost ring arc
    for glow in range(glow_steps, 0, -1):
        alpha = max(int(190 * (glow / glow_steps)), 28)
        line_width = thickness + glow * 16
        draw.arc(
            [center - 360 - glow, center - 360 - glow, center + 360 + glow, center + 360 + glow],
            start=48,
            end=312,
            fill=(color[0], color[1], color[2], alpha),
            width=line_width,
        )
    draw.arc(
        [center - 360, center - 360, center + 360, center + 360],
        start=48,
        end=312,
        fill=color + (255,),
        width=thickness,
    )

    # middle arc
    for glow in range(glow_steps, 0, -1):
        alpha = max(int(210 * (glow / glow_steps)), 24)
        line_width = thickness + glow * 14
        draw.arc(
            [center - 270 - glow, center - 270 - glow, center + 270 + glow, center + 270 + glow],
            start=48,
            end=312,
            fill=(color[0], color[1], color[2], alpha),
            width=line_width,
        )
    draw.arc(
        [center - 270, center - 270, center + 270, center + 270],
        start=48,
        end=312,
        fill=color + (255,),
        width=thickness,
    )

    # inner C shape
    for glow in range(glow_steps, 0, -1):
        alpha = max(int(235 * (glow / glow_steps)), 30)
        line_width = thickness + glow * 14
        draw.arc(
            [center - 175 - glow, center - 175 - glow, center + 175 + glow, center + 175 + glow],
            start=78,
            end=282,
            fill=(color[0], color[1], color[2], alpha),
            width=line_width,
        )
    draw.arc(
        [center - 175, center - 175, center + 175, center + 175],
        start=78,
        end=282,
        fill=color + (255,),
        width=thickness,
    )

    return draw

# Create the app icon
img = Image.new("RGBA", (size, size), bg_color)
draw = ImageDraw.Draw(img)
draw_neon_logo(draw, bg_color)
img.save(icon_path)

# Create the adaptive icon with transparent background
img2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw2 = ImageDraw.Draw(img2)
draw_neon_logo(draw2, None, transparent=True)
img2.save(adaptive_icon_path)

print(f"Saved {icon_path}\nSaved {adaptive_icon_path}")
