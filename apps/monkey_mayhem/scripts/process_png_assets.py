#!/usr/bin/env python3
"""Convert mislabeled JPEG assets to real PNGs; knock out near-black backgrounds."""

from __future__ import annotations

import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "static" / "assets" / "sprites"

# Paths relative to sprites/ — (make_transparent, black_threshold 0-255)
JOBS: dict[str, tuple[bool, int]] = {
    "mascot/monkey.png": (True, 32),
    "reelFrame/border.png": (True, 28),
    "reelFrame/board.png": (True, 24),
    "background/jungle_bg.png": (False, 0),
    # JPEG placeholders copied from mascot — strip black until real art lands
    "monkeySymbols/ST.png": (True, 32),
    "monkeySymbols/MW.png": (True, 32),
    "monkeySymbols/SEE.png": (True, 32),
    "monkeySymbols/HEAR.png": (True, 32),
    "monkeySymbols/SPEAK.png": (True, 32),
}


def is_jpeg(data: bytes) -> bool:
    return len(data) >= 2 and data[0] == 0xFF and data[1] == 0xD8


def is_png(data: bytes) -> bool:
    return data[:8] == b"\x89PNG\r\n\x1a\n"


def knock_out_black(img: Image.Image, threshold: int) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (r, g, b, 0)
    return rgba


def process_file(rel: str, transparent: bool, threshold: int) -> None:
    path = SPRITES / rel
    if not path.exists():
        print(f"SKIP missing: {rel}")
        return

    raw = path.read_bytes()
    if is_png(raw) and not transparent:
        print(f"OK already PNG: {rel}")
        return

    img = Image.open(path)
    if transparent:
        out = knock_out_black(img, threshold)
    else:
        out = img.convert("RGB")

    tmp = path.with_suffix(".png.tmp")
    out.save(tmp, format="PNG", optimize=True)
    tmp.replace(path)
    print(f"DONE {rel} -> PNG ({out.size[0]}x{out.size[1]}, alpha={transparent})")


def scan_border_inner() -> None:
    """Print opaque bbox + best-effort transparent opening for border.png."""
    path = SPRITES / "reelFrame/border.png"
    if not path.exists():
        print("SKIP scan: border.png missing")
        return
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    ox = [x for y in range(h) for x in range(w) if px[x, y][3] > 128]
    if not ox:
        print("scan border: no opaque pixels")
        return
    oy = [y for y in range(h) for x in range(w) if px[x, y][3] > 128]
    fx, fy = min(ox), min(oy)
    fw, fh = max(ox) - fx + 1, max(oy) - fy + 1
    minx, miny, maxx, maxy = fw, fh, 0, 0
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            if px[x, y][3] < 128:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    inner = {"x": minx, "y": miny, "w": maxx - minx + 1, "h": maxy - miny + 1}
    print(f"scan border opaque bbox: x={fx} y={fy} w={fw} h={fh}")
    print(f"scan border inner (alpha<128 in opaque bbox): {inner}")
    print("target 6x5 opening: {x: 273, y: 95, w: 480, h: 400}")


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--scan-border":
        scan_border_inner()
        return 0
    for rel, (transparent, threshold) in JOBS.items():
        process_file(rel, transparent, threshold)
    return 0


if __name__ == "__main__":
    sys.exit(main())
