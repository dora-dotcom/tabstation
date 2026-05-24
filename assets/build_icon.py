#!/usr/bin/env python3
"""Generate Tabstation extension icons (16/48/128 PNG) from a 16x16 pixel grid."""
from PIL import Image
from pathlib import Path

CORAL = (255, 127, 80, 255)
LIGHT = (255, 184, 154, 255)
DARK = (160, 48, 32, 255)
WHITE = (255, 255, 255, 255)


def make_grid():
    grid = [[CORAL for _ in range(16)] for _ in range(16)]
    for x in range(16):
        grid[0][x] = LIGHT
    for y in range(16):
        grid[y][0] = LIGHT
    for x in range(16):
        grid[15][x] = DARK
    for y in range(16):
        grid[y][15] = DARK
    grid[2][2] = WHITE
    grid[2][13] = WHITE
    grid[13][2] = WHITE
    grid[13][13] = WHITE
    for x in range(6, 10):
        grid[3][x] = WHITE
    for x in range(5, 7):
        grid[4][x] = WHITE
    for x in range(9, 11):
        grid[4][x] = WHITE
    grid[5][10] = WHITE
    grid[6][10] = WHITE
    for x in range(8, 10):
        grid[7][x] = WHITE
    for x in range(7, 9):
        grid[8][x] = WHITE
    for x in range(7, 9):
        grid[9][x] = WHITE
    for x in range(7, 9):
        grid[11][x] = WHITE
    for x in range(7, 9):
        grid[12][x] = WHITE
    return grid


def save_png(grid, size, path):
    img = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            img.putpixel((x, y), grid[y][x])
    img = img.resize((size, size), Image.NEAREST)
    img.save(path)


if __name__ == "__main__":
    here = Path(__file__).parent
    grid = make_grid()
    save_png(grid, 16, here / "icon16.png")
    save_png(grid, 48, here / "icon48.png")
    save_png(grid, 128, here / "icon128.png")
    print("Wrote icon16.png, icon48.png, icon128.png")
