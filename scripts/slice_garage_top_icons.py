"""Slice images/icons_garage_top.png into 4 separate icons.

Automatically detects icon columns by analysing vertical bands of non-background
pixels, then crops each icon with a small padding and saves to
images/garage-top-icons/ with fixed names matching the summary cards.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path("images/icons_garage_top.png")
OUT_DIR = Path("images/garage-top-icons")
OUT_NAMES = ["motorcycles.png", "attention.png", "tasks.png", "expenses.png"]
PADDING = 20


WHITE_THRESHOLD = 240


def is_content_pixel(rgba: tuple[int, int, int, int]) -> bool:
    r, g, b, a = rgba
    if a < 16:
        return False
    return not (r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD)


def remove_white_background(img: Image.Image) -> Image.Image:
    """Return a copy of img with near-white pixels turned fully transparent."""
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = pixels[x, y]
            if a >= 16 and r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                pixels[x, y] = (255, 255, 255, 0)
    return img


def main() -> None:
    img = remove_white_background(Image.open(SRC))
    width, height = img.size
    pixels = img.load()

    col_has = [False] * width
    for x in range(width):
        for y in range(height):
            if is_content_pixel(pixels[x, y]):
                col_has[x] = True
                break

    bands: list[tuple[int, int]] = []
    start = None
    for x in range(width):
        if col_has[x] and start is None:
            start = x
        elif not col_has[x] and start is not None:
            bands.append((start, x - 1))
            start = None
    if start is not None:
        bands.append((start, width - 1))

    # Merge bands that are very close (icon with thin gap inside e.g. clock hands).
    merged: list[tuple[int, int]] = []
    for band in bands:
        if merged and band[0] - merged[-1][1] < 25:
            merged[-1] = (merged[-1][0], band[1])
        else:
            merged.append(band)

    if len(merged) != len(OUT_NAMES):
        raise SystemExit(
            f"Expected {len(OUT_NAMES)} icons, detected {len(merged)} bands: {merged}"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for (x0, x1), name in zip(merged, OUT_NAMES):
        row_has = [False] * height
        for y in range(height):
            for x in range(x0, x1 + 1):
                if is_content_pixel(pixels[x, y]):
                    row_has[y] = True
                    break
        y0 = next(i for i, v in enumerate(row_has) if v)
        y1 = height - 1 - next(i for i, v in enumerate(reversed(row_has)) if v)

        left = max(0, x0 - PADDING)
        top = max(0, y0 - PADDING)
        right = min(width, x1 + 1 + PADDING)
        bottom = min(height, y1 + 1 + PADDING)

        crop = img.crop((left, top, right, bottom))

        # Pad to a square so the rendered size matches other icons.
        side = max(crop.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.paste(
            crop,
            ((side - crop.size[0]) // 2, (side - crop.size[1]) // 2),
        )
        out_path = OUT_DIR / name
        square.save(out_path, optimize=True)
        print(f"Saved {out_path} ({square.size[0]}x{square.size[1]})")


if __name__ == "__main__":
    main()
