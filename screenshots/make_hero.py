#!/usr/bin/env python3
"""Generate the README hero banner for Tabstation.

Requires:
  - Pillow (`pip install pillow`)
  - Press Start 2P TTF at /tmp/PressStart2P.ttf
    (curl -sL -o /tmp/PressStart2P.ttf 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf')

Outputs: screenshots/hero.png
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 480
HORIZON_Y = int(H * 0.78)

FONT_PATH = "/tmp/PressStart2P.ttf"

# Palette (matches the Tabstation dark theme)
SKY_TOP = (74, 42, 120)
SKY_HORIZON = (58, 31, 96)
GROUND_TOP = (26, 8, 32)
GROUND_BOTTOM = (10, 4, 16)
CORAL = (255, 127, 80)
CORAL_LIGHT = (255, 184, 154)
CORAL_DARK = (160, 48, 32)
WHITE = (255, 255, 255)
COIN = (251, 208, 0)
COIN_HI = (255, 245, 184)
RED = (229, 37, 33)
BRICK_DK = (26, 8, 16)
CACTUS = (21, 97, 49)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_sky_and_ground(img, draw):
    for y in range(HORIZON_Y):
        c = lerp(SKY_TOP, SKY_HORIZON, y / HORIZON_Y)
        draw.line([(0, y), (W, y)], fill=c)
    for y in range(HORIZON_Y, H):
        c = lerp(GROUND_TOP, GROUND_BOTTOM, (y - HORIZON_Y) / max(1, H - HORIZON_Y))
        draw.line([(0, y), (W, y)], fill=c)


def draw_stars(draw, count=90, seed=42):
    random.seed(seed)
    colors = [WHITE] * 7 + [COIN_HI] * 2 + [COIN]
    for _ in range(count):
        x = random.randint(20, W - 20)
        y = random.randint(20, int(H * 0.6))
        size = random.choice([2, 2, 2, 3, 3, 4])
        c = random.choice(colors)
        draw.rectangle([x, y, x + size - 1, y + size - 1], fill=c)


def draw_q_block(draw, x, y, size, q_font):
    """Draw the coral ? block at (x,y) with given size."""
    edge = max(2, size // 14)
    # red drop shadow
    sh = 5
    draw.rectangle([x + sh, y + sh, x + size + sh, y + size + sh], fill=RED)
    # main coral fill
    draw.rectangle([x, y, x + size, y + size], fill=CORAL)
    # light edges (top + left)
    draw.rectangle([x, y, x + size, y + edge], fill=CORAL_LIGHT)
    draw.rectangle([x, y, x + edge, y + size], fill=CORAL_LIGHT)
    # dark edges (bottom + right)
    draw.rectangle([x, y + size - edge, x + size, y + size], fill=CORAL_DARK)
    draw.rectangle([x + size - edge, y, x + size, y + size], fill=CORAL_DARK)
    # rivets (4 corners)
    r = max(2, size // 18)
    inset = max(5, size // 8)
    for rx, ry in [(inset, inset),
                   (size - inset - r, inset),
                   (inset, size - inset - r),
                   (size - inset - r, size - inset - r)]:
        draw.rectangle([x + rx, y + ry, x + rx + r, y + ry + r], fill=WHITE)
    # ? glyph rendered with the pixel font, centered
    qb = q_font.getbbox("?")
    qw, qh = qb[2] - qb[0], qb[3] - qb[1]
    qx = x + (size - qw) // 2 - qb[0]
    qy = y + (size - qh) // 2 - qb[1] - 2
    draw.text((qx, qy), "?", fill=WHITE, font=q_font)


def draw_cactus(draw, cx, base_y, height, arms=2):
    """Pixel cactus: trunk + 0/1/2 arms. height ≈ trunk height in px."""
    color = CACTUS
    trunk_w = max(6, height // 10)
    draw.rectangle([cx - trunk_w // 2, base_y - height, cx + trunk_w // 2, base_y], fill=color)
    arm_h = max(8, height // 3)
    arm_w = max(5, height // 11)
    if arms >= 1:
        ax_l = cx - trunk_w // 2 - arm_w
        ay_l = base_y - height // 2 - arm_h // 2
        draw.rectangle([ax_l, ay_l, cx - trunk_w // 2, ay_l + arm_h], fill=color)
        draw.rectangle([ax_l, ay_l - max(2, arm_w // 2), ax_l + arm_w, ay_l], fill=color)
    if arms >= 2:
        ax_r = cx + trunk_w // 2
        ay_r = base_y - int(height * 0.6)
        arm_h2 = max(8, int(height * 0.45))
        draw.rectangle([ax_r, ay_r, ax_r + arm_w, ay_r + arm_h2], fill=color)
        draw.rectangle([ax_r + arm_w - max(2, arm_w // 2), ay_r - max(2, arm_w // 2), ax_r + arm_w, ay_r], fill=color)


def main():
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    draw_sky_and_ground(img, draw)
    draw_stars(draw)

    # Title TABSTAT?ON
    title_font = ImageFont.truetype(FONT_PATH, 64)
    q_font = ImageFont.truetype(FONT_PATH, 36)
    left, right = "TABSTAT", "ON"

    lb = title_font.getbbox(left)
    rb = title_font.getbbox(right)
    lw = lb[2] - lb[0]
    rw = rb[2] - rb[0]
    ch = lb[3] - lb[1]

    block = 60
    gap = 6
    total_w = lw + gap + block + gap + rw
    tx = (W - total_w) // 2
    ty = (H - ch) // 2 - 40

    # drop shadow
    sh = 5
    draw.text((tx + sh, ty + sh), left, fill=RED, font=title_font)
    draw.text((tx + lw + gap + block + gap + sh, ty + sh), right, fill=RED, font=title_font)

    # main coin-yellow letters
    draw.text((tx, ty), left, fill=COIN, font=title_font)
    draw.text((tx + lw + gap + block + gap, ty), right, fill=COIN, font=title_font)

    # ? block
    bx = tx + lw + gap
    by = ty + (ch - block) // 2 + ch // 8  # nudge down a touch for visual balance
    draw_q_block(draw, bx, by, block, q_font)

    # Tagline
    tagline_font = ImageFont.truetype(FONT_PATH, 14)
    tagline = "8-BIT PIXEL WORKSPACE TAB MANAGER FOR CHROME"
    tb = tagline_font.getbbox(tagline)
    tagline_x = (W - (tb[2] - tb[0])) // 2
    tagline_y = ty + ch + 50
    draw.text((tagline_x + 2, tagline_y + 2), tagline, fill=BRICK_DK, font=tagline_font)
    draw.text((tagline_x, tagline_y), tagline, fill=COIN_HI, font=tagline_font)

    # Cacti silhouettes at the horizon
    cacti = [
        (80, HORIZON_Y + 30, 60, 1),
        (220, HORIZON_Y + 25, 38, 0),
        (380, HORIZON_Y + 35, 78, 2),
        (560, HORIZON_Y + 30, 45, 1),
        (760, HORIZON_Y + 38, 72, 2),
        (940, HORIZON_Y + 26, 50, 1),
        (1110, HORIZON_Y + 32, 66, 2),
        (1230, HORIZON_Y + 22, 32, 0),
    ]
    for cx, by, height, arms in cacti:
        draw_cactus(draw, cx, by, height, arms)

    out = Path(__file__).parent / "hero.png"
    img.save(out, optimize=True)
    print(f"Wrote {out} ({W}×{H})")


if __name__ == "__main__":
    main()
