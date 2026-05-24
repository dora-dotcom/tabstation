#!/usr/bin/env python3
"""Generate the README hero banner for Tabstation.

Split design: daytime sky on the left, nighttime desert on the right.
Wordmark sits centered across the split.

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
SPLIT_X = W // 2

FONT_PATH = "/tmp/PressStart2P.ttf"

# Daytime palette (SMB1 overworld)
SKY_DAY = (107, 140, 255)         # #6B8CFF
SKY_DAY_HORIZON = (170, 200, 255)  # lighter near the horizon
GROUND_DAY_TOP = (200, 76, 12)     # #C84C0C
GROUND_DAY_BOTTOM = (181, 49, 32)  # #B53120
CLOUD = (255, 255, 255)
BUSH = (0, 154, 54)                # #009A36 - pipe green

# Nighttime palette
SKY_NIGHT_TOP = (74, 42, 120)      # #4A2A78
SKY_NIGHT_HORIZON = (58, 31, 96)
GROUND_NIGHT_TOP = (26, 8, 32)
GROUND_NIGHT_BOTTOM = (10, 4, 16)
STAR_WHITE = (255, 255, 255)
STAR_YELLOW = (251, 208, 0)
STAR_CREAM = (255, 245, 184)
CACTUS = (21, 97, 49)

# Wordmark / shared
CORAL = (255, 127, 80)
CORAL_LIGHT = (255, 184, 154)
CORAL_DARK = (160, 48, 32)
WHITE = (255, 255, 255)
COIN = (251, 208, 0)
COIN_HI = (255, 245, 184)
RED = (229, 37, 33)
BRICK_DK = (26, 8, 16)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_split_background(draw):
    # Sky
    for y in range(HORIZON_Y):
        t = y / HORIZON_Y
        c_day = lerp(SKY_DAY, SKY_DAY_HORIZON, t)
        c_night = lerp(SKY_NIGHT_TOP, SKY_NIGHT_HORIZON, t)
        draw.line([(0, y), (SPLIT_X - 1, y)], fill=c_day)
        draw.line([(SPLIT_X, y), (W, y)], fill=c_night)
    # Ground
    for y in range(HORIZON_Y, H):
        t = (y - HORIZON_Y) / max(1, H - HORIZON_Y)
        c_day = lerp(GROUND_DAY_TOP, GROUND_DAY_BOTTOM, t)
        c_night = lerp(GROUND_NIGHT_TOP, GROUND_NIGHT_BOTTOM, t)
        draw.line([(0, y), (SPLIT_X - 1, y)], fill=c_day)
        draw.line([(SPLIT_X, y), (W, y)], fill=c_night)


def draw_cloud(draw, x, y, scale=2):
    s = scale
    # Three stacked "rows" of varying width make a chunky pixel cloud
    draw.rectangle([x + 2 * s, y, x + 6 * s + 1, y + s + 1], fill=CLOUD)
    draw.rectangle([x + s, y + s, x + 7 * s + 1, y + 2 * s + 1], fill=CLOUD)
    draw.rectangle([x, y + 2 * s, x + 8 * s + 1, y + 3 * s + 1], fill=CLOUD)
    # Soft underbelly
    draw.rectangle([x + s, y + 3 * s, x + 7 * s + 1, y + 4 * s], fill=CLOUD)


def draw_clouds(draw):
    clouds = [
        (40, 60, 3),
        (180, 110, 2),
        (300, 70, 4),
        (440, 130, 2),
        (510, 60, 3),
    ]
    for cx, cy, s in clouds:
        # Only draw clouds entirely on the day side
        if cx + 8 * s < SPLIT_X - 10:
            draw_cloud(draw, cx, cy, s)


def draw_bush(draw, cx, base_y, scale=3):
    """A simple SMB bush silhouette on the day side ground."""
    s = scale
    # rounded shape from pixel rectangles
    draw.rectangle([cx - 4 * s, base_y - 2 * s, cx + 4 * s, base_y], fill=BUSH)
    draw.rectangle([cx - 3 * s, base_y - 3 * s, cx + 3 * s, base_y - 2 * s], fill=BUSH)
    draw.rectangle([cx - s, base_y - 4 * s, cx + s, base_y - 3 * s], fill=BUSH)


def draw_bushes(draw):
    # SMB-style bushes scattered on the day-side ground
    bushes = [
        (90, HORIZON_Y + 28, 3),
        (260, HORIZON_Y + 24, 2),
        (430, HORIZON_Y + 30, 4),
        (560, HORIZON_Y + 22, 2),
    ]
    for cx, by, s in bushes:
        # ensure bush stays on day side
        if cx + 4 * s < SPLIT_X - 10:
            draw_bush(draw, cx, by, s)


def draw_stars(draw, count=60, seed=42):
    random.seed(seed)
    colors = [STAR_WHITE] * 7 + [STAR_CREAM] * 2 + [STAR_YELLOW]
    for _ in range(count):
        x = random.randint(SPLIT_X + 20, W - 20)
        y = random.randint(20, int(H * 0.6))
        size = random.choice([2, 2, 2, 3, 3, 4])
        c = random.choice(colors)
        draw.rectangle([x, y, x + size - 1, y + size - 1], fill=c)


def draw_cactus(draw, cx, base_y, height, arms=2):
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


def draw_cacti(draw):
    # Only on the night side
    cacti = [
        (700, HORIZON_Y + 30, 60, 1),
        (820, HORIZON_Y + 38, 78, 2),
        (940, HORIZON_Y + 26, 50, 1),
        (1080, HORIZON_Y + 32, 66, 2),
        (1210, HORIZON_Y + 22, 38, 0),
    ]
    for cx, by, height, arms in cacti:
        if cx > SPLIT_X + 20:
            draw_cactus(draw, cx, by, height, arms)


def draw_q_block(draw, x, y, size, q_font):
    edge = max(2, size // 14)
    sh = 5
    draw.rectangle([x + sh, y + sh, x + size + sh, y + size + sh], fill=RED)
    draw.rectangle([x, y, x + size, y + size], fill=CORAL)
    draw.rectangle([x, y, x + size, y + edge], fill=CORAL_LIGHT)
    draw.rectangle([x, y, x + edge, y + size], fill=CORAL_LIGHT)
    draw.rectangle([x, y + size - edge, x + size, y + size], fill=CORAL_DARK)
    draw.rectangle([x + size - edge, y, x + size, y + size], fill=CORAL_DARK)
    r = max(2, size // 18)
    inset = max(5, size // 8)
    for rx, ry in [(inset, inset),
                   (size - inset - r, inset),
                   (inset, size - inset - r),
                   (size - inset - r, size - inset - r)]:
        draw.rectangle([x + rx, y + ry, x + rx + r, y + ry + r], fill=WHITE)
    qb = q_font.getbbox("?")
    qw, qh = qb[2] - qb[0], qb[3] - qb[1]
    qx = x + (size - qw) // 2 - qb[0]
    qy = y + (size - qh) // 2 - qb[1] - 2
    draw.text((qx, qy), "?", fill=WHITE, font=q_font)


def main():
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    draw_split_background(draw)
    draw_clouds(draw)
    draw_bushes(draw)
    draw_stars(draw)
    draw_cacti(draw)

    # Wordmark TABSTAT?ON, centered across the split
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

    sh = 5
    draw.text((tx + sh, ty + sh), left, fill=RED, font=title_font)
    draw.text((tx + lw + gap + block + gap + sh, ty + sh), right, fill=RED, font=title_font)
    draw.text((tx, ty), left, fill=COIN, font=title_font)
    draw.text((tx + lw + gap + block + gap, ty), right, fill=COIN, font=title_font)

    bx = tx + lw + gap
    by = ty + (ch - block) // 2 - 6
    draw_q_block(draw, bx, by, block, q_font)

    # Tagline
    tagline_font = ImageFont.truetype(FONT_PATH, 14)
    tagline = "8-BIT  ·  KEYBOARD-FIRST  ·  TAB MANAGER FOR CHROME"
    tb = tagline_font.getbbox(tagline)
    tagline_x = (W - (tb[2] - tb[0])) // 2
    tagline_y = ty + ch + 50
    draw.text((tagline_x + 2, tagline_y + 2), tagline, fill=BRICK_DK, font=tagline_font)
    draw.text((tagline_x, tagline_y), tagline, fill=COIN_HI, font=tagline_font)

    out = Path(__file__).parent / "hero.png"
    img.save(out, optimize=True)
    print(f"Wrote {out} ({W}×{H})")


if __name__ == "__main__":
    main()
