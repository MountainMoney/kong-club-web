"""Import the art-pack zip contents into static/assets.

Camera-dump filenames → game keys. Near-black pixels become transparent.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\Cole\Downloads\Monkey Mayhem Asset_import\Monkey Mayhem Asset")
APP = Path(__file__).resolve().parents[1]
STATIC = APP / "static" / "assets"
SYM = STATIC / "sprites" / "monkeySymbols"
BG = STATIC / "sprites" / "background"
MASCOT = STATIC / "sprites" / "mascot"
REEL = STATIC / "sprites" / "reelFrame"
UI = STATIC / "monkey" / "ui"
FX = STATIC / "sprites" / "fx"

# Visual map from pack review (IMG_#### → symbol / UI key).
SYMBOL_MAP = {
    "IMG_7005..PNG": "CB.png",  # blank gold coin (bronze base)
    "IMG_7006..PNG": "CS.png",  # blank silver coin
    "IMG_7007..PNG": "CG.png",  # blank gold coin (gold tier)
    "IMG_7009..PNG": "J.png",
    "IMG_7010..PNG": "Q.png",
    "IMG_7011..PNG": "K.png",
    "IMG_7012..PNG": "A.png",
    "IMG_7013..PNG": "T.png",  # 10
    "IMG_7014..PNG": "LE.png",  # monstera leaves (no lemon in pack)
    "IMG_7015..PNG": "CO.png",
    "IMG_7016..PNG": "OR.png",
    "IMG_7017..PNG": "BA.png",
    "IMG_7018..PNG": "GR.png",
    "IMG_7019..PNG": "ST.png",
}

OTHER = {
    # Full BG is a painted scene — do NOT knock out blacks.
    "background/Full Bg.png": (BG / "jungle_bg.png", False),
    "symbols/IMG_7008..PNG": (FX / "sparkle.png", True),
    "typography/IMG_6984..PNG": (REEL / "title_art.png", True),
    "typography/IMG_7020..PNG": (UI / "win_popup_big.png", True),
    "typography/IMG_7021..PNG": (UI / "win_popup_super.png", True),
    "typography/IMG_7022..PNG": (UI / "win_popup_mega.png", True),
    "typography/IMG_7023..PNG": (UI / "win_popup_epic.png", True),
    "typography/IMG_7024..PNG": (UI / "label_total_win_tier1.png", True),
}


def knock_out_black(im: Image.Image, threshold: int = 18) -> Image.Image:
    """Turn near-black opaque pixels into transparency (phone-export BG)."""
    rgba = im.convert("RGBA")
    pixels = list(rgba.getdata())
    out = []
    for r, g, b, a in pixels:
        if a and r <= threshold and g <= threshold and b <= threshold:
            out.append((r, g, b, 0))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def save_processed(src: Path, dest: Path, *, knock_black: bool) -> tuple[int, int]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    if knock_black:
        im = knock_out_black(im)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
    im.save(dest, format="PNG", optimize=True)
    return im.size


def main() -> None:
    for folder in (SYM, BG, MASCOT, REEL, UI, FX):
        folder.mkdir(parents=True, exist_ok=True)

    report: list[str] = []
    for src_name, dest_name in SYMBOL_MAP.items():
        src = SRC / "symbols" / src_name
        dest = SYM / dest_name
        if not src.exists():
            report.append(f"MISSING {src}")
            continue
        size = save_processed(src, dest, knock_black=True)
        report.append(f"OK {dest_name} {size[0]}x{size[1]}")

    for rel, (dest, knock) in OTHER.items():
        src = SRC / rel
        if not src.exists():
            report.append(f"MISSING {rel}")
            continue
        size = save_processed(src, dest, knock_black=knock)
        report.append(f"OK {dest.relative_to(STATIC)} {size[0]}x{size[1]}")

    # TOTAL WIN → all three outro tiers (only one art in pack).
    tier1 = UI / "label_total_win_tier1.png"
    if tier1.exists():
        for tier in ("label_total_win_tier2.png", "label_total_win_tier3.png"):
            Image.open(tier1).save(UI / tier, format="PNG", optimize=True)
            report.append(f"OK monkey/ui/{tier} (copy of tier1)")

    # Logo also under monkey/ui for splash reuse.
    title = REEL / "title_art.png"
    if title.exists():
        Image.open(title).save(UI / "title_art.png", format="PNG", optimize=True)
        report.append("OK monkey/ui/title_art.png")

    psd = SRC / "MM_Mascot_2.psd"
    if psd.exists():
        report.append(f"SKIP mascot PSD (export PNG manually): {psd.name}")
        character = UI / "character.png"
        if character.exists():
            im = Image.open(character).convert("RGBA")
            im.save(MASCOT / "monkey.png", format="PNG", optimize=True)
            report.append(f"OK mascot/monkey.png from character.png {im.size[0]}x{im.size[1]}")

    for keep in ("W.png", "EXPLODED_W.png", "MW.png"):
        p = SYM / keep
        report.append(f"{'KEEP' if p.exists() else 'MISSING'} monkeySymbols/{keep}")

    print("\n".join(report))
    print("import-art-pack: done")


if __name__ == "__main__":
    main()
