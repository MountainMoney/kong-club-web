"""Original jungle bitmap fonts and sprite sheets. Replaces the sample SDK art in place."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static/assets"
FONT = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

CHARS = [chr(code) for code in range(32, 127)]


def tinted_font(name: str, fill: tuple[int, int, int], blur: int, page_name: str, xml_name: str) -> None:
	folder = STATIC / "fonts" / name
	folder.mkdir(parents=True, exist_ok=True)
	face = ImageFont.truetype(FONT, 64)
	cell_w, cell_h = 52, 72
	cols = 16
	rows = (len(CHARS) + cols - 1) // cols
	sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))
	draw = ImageDraw.Draw(sheet)
	chars_xml = []
	for index, char in enumerate(CHARS):
		col, row = index % cols, index // cols
		x, y = col * cell_w, row * cell_h
		draw.text((x + 4, y + 4), char, font=face, fill=(*fill, 255))
		bbox = draw.textbbox((0, 0), char, font=face)
		width = max(8, bbox[2] - bbox[0] + 8)
		chars_xml.append(
			f'    <char id="{ord(char)}" x="{x}" y="{y}" width="{width}" height="{cell_h}" '
			f'xoffset="0" yoffset="0" xadvance="{width}" yadvance="{cell_h}"/>'
		)
	if blur:
		sheet = sheet.filter(ImageFilter.GaussianBlur(blur))
	page = folder / page_name
	if page.suffix == ".webp":
		png = page.with_suffix(".png")
		sheet.save(png)
		import subprocess

		subprocess.run(
			["ffmpeg", "-y", "-i", str(png), "-c:v", "libwebp", str(page)],
			check=True,
			capture_output=True,
		)
		png.unlink()
	else:
		sheet.save(page)
	xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<font>
  <info face="Kong Club {name}" size="64" bold="1" italic="0" charset="" unicode="" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="1,1" outline="0"/>
  <common lineHeight="{cell_h}" base="{cell_h - 8}" scaleW="{sheet.width}" scaleH="{sheet.height}" pages="1" packed="0"/>
  <pages>
    <page id="0" file="{page_name}"/>
  </pages>
  <chars count="{len(chars_xml)}">
{chr(10).join(chars_xml)}
  </chars>
</font>
"""
	(folder / xml_name).write_text(xml)


def plaque(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, fill: tuple[int, int, int]) -> None:
	draw.rounded_rectangle(box, radius=18, fill=(*fill, 255), outline=(40, 24, 8, 255), width=6)
	face = ImageFont.truetype(FONT, 28)
	text = label
	bbox = draw.textbbox((0, 0), text, font=face)
	tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
	x = box[0] + (box[2] - box[0] - tw) / 2
	y = box[1] + (box[3] - box[1] - th) / 2 - 4
	draw.text((x, y), text, font=face, fill=(255, 236, 170, 255))


def progress_bar() -> None:
	sheet = Image.new("RGBA", (1482, 89), (0, 0, 0, 0))
	draw = ImageDraw.Draw(sheet)
	draw.rounded_rectangle((1, 8, 492, 80), radius=20, fill=(92, 168, 64, 255))
	draw.rounded_rectangle((495, 8, 986, 80), radius=20, fill=(48, 32, 18, 255))
	draw.rounded_rectangle((989, 4, 1480, 84), radius=22, outline=(214, 164, 64, 255), width=8)
	dest = STATIC / "sprites/progressBar/progressBar.webp"
	png = dest.with_suffix(".png")
	sheet.save(png)
	import subprocess

	subprocess.run(["ffmpeg", "-y", "-i", str(png), "-c:v", "libwebp", str(dest)], check=True, capture_output=True)
	png.unlink()


def pay_frame() -> None:
	image = Image.new("RGBA", (1001, 996), (0, 0, 0, 0))
	draw = ImageDraw.Draw(image)
	draw.rounded_rectangle((40, 40, 960, 956), radius=48, outline=(214, 164, 64, 255), width=18)
	draw.rounded_rectangle((70, 70, 930, 926), radius=36, outline=(36, 92, 42, 255), width=10)
	image.save(STATIC / "sprites/payFrame/payFrame.png")


def reels_frame() -> None:
	frames = {
		"frame_bg.png": (420, 300, (28, 72, 36)),
		"frame_edge.png": (420, 300, (214, 164, 64)),
		"frame_fade.png": (280, 180, (12, 28, 16)),
		"Frame_FSCounter.png": (220, 90, (48, 110, 52)),
		"Frame_Multiplier.png": (200, 80, (168, 96, 32)),
		"Frame_Tumble.png": (200, 80, (64, 120, 70)),
		"Frame_TumbleWin.png": (220, 90, (196, 140, 40)),
		"pressanywhere_fade.png": (240, 48, (20, 20, 20)),
	}
	width = 460
	height = sum(size[1] + 8 for size in frames.values()) + 8
	sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
	draw = ImageDraw.Draw(sheet)
	atlas = {}
	y = 4
	for name, (w, h, color) in frames.items():
		box = (8, y, 8 + w, y + h)
		draw.rounded_rectangle(box, radius=16, fill=(*color, 230), outline=(255, 220, 140, 255), width=4)
		atlas[name] = {
			"frame": {"x": 8, "y": y, "w": w, "h": h},
			"rotated": False,
			"trimmed": False,
			"spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
			"sourceSize": {"w": w, "h": h},
		}
		y += h + 8
	folder = STATIC / "sprites/reelsFrame"
	sheet.save(folder / "reels_frame.png")
	payload = {
		"frames": atlas,
		"meta": {
			"app": "kong-club",
			"version": "1.0",
			"image": "reels_frame.png",
			"format": "RGBA8888",
			"size": {"w": width, "h": height},
			"scale": "1",
		},
	}
	(folder / "reels_frame.json").write_text(json.dumps(payload, indent=2) + "\n")


def free_spins() -> None:
	names = [
		"freespins.png",
		"freespins_ar.png",
		"freespins_de.png",
		"freespins_en.png",
		"freespins_es.png",
		"freespins_fi.png",
		"freespins_fr.png",
		"freespins_hi.png",
		"freespins_id.png",
		"freespins_ja.png",
		"freespins_ko.png",
		"freespins_pl.png",
		"freespins_pt.png",
		"freespins_ru.png",
		"freespins_tr.png",
		"freespins_vi.png",
		"freespins_zh.png",
		"totalwin.png",
	]
	cell_w, cell_h = 220, 64
	cols = 3
	rows = (len(names) + cols - 1) // cols
	sheet = Image.new("RGBA", (cols * cell_w + 8, rows * cell_h + 8), (0, 0, 0, 0))
	draw = ImageDraw.Draw(sheet)
	atlas = {}
	for index, name in enumerate(names):
		col, row = index % cols, index // cols
		x, y = 4 + col * cell_w, 4 + row * cell_h
		label = "WIN" if name.startswith("total") else name.removesuffix(".png").split("_")[-1].upper()
		if name == "freespins.png":
			label = "KONG"
		plaque(draw, (x, y, x + cell_w - 8, y + cell_h - 8), label, (34, 96, 42))
		atlas[name] = {
			"frame": {"x": x, "y": y, "w": cell_w - 8, "h": cell_h - 8},
			"rotated": False,
			"trimmed": False,
			"spriteSourceSize": {"x": 0, "y": 0, "w": cell_w - 8, "h": cell_h - 8},
			"sourceSize": {"w": cell_w - 8, "h": cell_h - 8},
		}
	folder = STATIC / "sprites/freeSpins"
	png = folder / "freeSpins.png"
	sheet.save(png)
	import subprocess

	webp = folder / "freeSpins.webp"
	subprocess.run(["ffmpeg", "-y", "-i", str(png), "-c:v", "libwebp", str(webp)], check=True, capture_output=True)
	png.unlink()
	payload = {
		"frames": atlas,
		"meta": {
			"app": "kong-club",
			"version": "1.0",
			"image": "freeSpins.webp",
			"format": "RGBA8888",
			"size": {"w": sheet.width, "h": sheet.height},
			"scale": "1",
		},
	}
	(folder / "freeSpins.json").write_text(json.dumps(payload, indent=2) + "\n")


def main() -> None:
	tinted_font("goldFont", (232, 176, 48), 0, "mm_gold.webp", "mm_gold.xml")
	tinted_font("goldBlur", (232, 176, 48), 2, "miningfont_gold_blur.webp", "miningfont_gold_blur.xml")
	tinted_font("silverFont", (214, 220, 226), 0, "mm_silver.png", "mm_silver.xml")
	tinted_font("purpleFont", (168, 96, 214), 0, "mm_purple.png", "mm_purple.xml")
	progress_bar()
	pay_frame()
	reels_frame()
	free_spins()
	print("presentation art written")


if __name__ == "__main__":
	main()
