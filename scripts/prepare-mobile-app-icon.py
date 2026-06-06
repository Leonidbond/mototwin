#!/usr/bin/env python3
"""Remove checkerboard background and export 1024px Expo app icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "images/examples/mobile icon.png"
ASSETS = ROOT / "apps/app/assets"
IOS_ICON = ROOT / "apps/app/ios/MotoTwin/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"
TRANSPARENT_COPY = ROOT / "images/examples/mobile-icon-transparent.png"
SIZE = 1024


def remove_checkerboard(img: Image.Image, thresh: int = 40) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_light_bg(r: int, g: int, b: int, a: int) -> bool:
        if a == 0:
            return True
        if max(abs(r - g), abs(g - b), abs(r - b)) > 18:
            return False
        return r >= 200 and g >= 200 and b >= 200

    seeds: list[tuple[int, int]] = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(w):
        for y in (0, h - 1):
            if is_light_bg(*px[x, y]):
                seeds.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_light_bg(*px[x, y]):
                seeds.append((x, y))

    seen: set[tuple[int, int]] = set()
    for xy in seeds:
        if xy in seen:
            continue
        r, g, b, a = px[xy]
        if a == 0 or not is_light_bg(r, g, b, a):
            continue
        ImageDraw.floodfill(img, xy, (0, 0, 0, 0), thresh=thresh)
        seen.add(xy)

    return img


def main() -> None:
    img = Image.open(SRC)
    img = remove_checkerboard(img)
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

    ASSETS.mkdir(parents=True, exist_ok=True)
    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png"):
        img.save(ASSETS / name, "PNG", optimize=True)

    img.save(TRANSPARENT_COPY, "PNG", optimize=True)
    if IOS_ICON.parent.exists():
        img.save(IOS_ICON, "PNG", optimize=True)

    print(f"Exported {SIZE}x{SIZE} icons to {ASSETS}")


if __name__ == "__main__":
    main()
