"""Synthesize the Kong Club sound sprite. Names and loop flags stay; the audio is new."""

from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "static/assets/audio"
GAP = 0.04


def env(n: int, attack: float, release: float) -> np.ndarray:
	e = np.ones(n, dtype=np.float32)
	a = min(n, max(1, int(attack * SR)))
	r = min(n, max(1, int(release * SR)))
	e[:a] = np.linspace(0, 1, a, dtype=np.float32)
	if r > 0:
		e[-r:] *= np.linspace(1, 0, r, dtype=np.float32)
	return e


def tone(freq: float, dur: float, vol: float = 0.2, attack: float = 0.01, release: float = 0.08) -> np.ndarray:
	n = max(1, int(dur * SR))
	t = np.arange(n, dtype=np.float32) / SR
	wave_ = np.sin(2 * np.pi * freq * t)
	wave_ += 0.35 * np.sin(2 * np.pi * freq * 2 * t)
	return (wave_ * env(n, attack, release) * vol).astype(np.float32)


def noise(dur: float, vol: float = 0.12, attack: float = 0.005, release: float = 0.05) -> np.ndarray:
	n = max(1, int(dur * SR))
	rng = np.random.default_rng(int(dur * 1000) + int(vol * 100))
	burst = rng.uniform(-1, 1, n).astype(np.float32)
	return (burst * env(n, attack, release) * vol).astype(np.float32)


def mix(*parts: np.ndarray) -> np.ndarray:
	n = max(len(p) for p in parts)
	out = np.zeros(n, dtype=np.float32)
	for part in parts:
		out[: len(part)] += part
	peak = np.max(np.abs(out)) or 1
	return (out / peak * 0.9).astype(np.float32)


def pad_loop(seconds: float, root: float, pulse: float) -> np.ndarray:
	n = int(seconds * SR)
	t = np.arange(n, dtype=np.float32) / SR
	notes = [root, root * 1.25, root * 1.5, root * 2]
	bed = np.zeros(n, dtype=np.float32)
	for i, freq in enumerate(notes):
		bed += np.sin(2 * np.pi * freq * t) * (0.12 / (i + 1))
	trem = 0.65 + 0.35 * np.sin(2 * np.pi * 0.25 * t)
	drum = np.zeros(n, dtype=np.float32)
	step = int(SR * pulse)
	for start in range(0, n, step):
		hit = noise(0.09, 0.18, 0.002, 0.07)
		end = min(n, start + len(hit))
		drum[start:end] += hit[: end - start]
	return mix(bed * trem, drum * 0.35)


def chirp(dur: float, f0: float, f1: float, vol: float = 0.22) -> np.ndarray:
	n = max(1, int(dur * SR))
	t = np.arange(n, dtype=np.float32) / SR
	freq = np.linspace(f0, f1, n, dtype=np.float32)
	phase = np.cumsum(freq) / SR * 2 * np.pi
	return (np.sin(phase) * env(n, 0.01, dur * 0.35) * vol).astype(np.float32)


def build_clips() -> list[tuple[str, np.ndarray, bool]]:
	clips: list[tuple[str, np.ndarray, bool]] = [
		("bgm_freespin", pad_loop(8, 196, 0.4), True),
		("bgm_main", pad_loop(10, 146, 0.5), True),
		("bgm_winlevel_big", pad_loop(3.2, 220, 0.28), True),
		("bgm_winlevel_epic", pad_loop(3.2, 247, 0.25), True),
		("bgm_winlevel_max", pad_loop(3.2, 294, 0.22), True),
		("bgm_winlevel_mega", pad_loop(3.2, 262, 0.24), True),
		("bgm_winlevel_superwin", pad_loop(3.2, 330, 0.2), True),
		("jng_intro_fs", chirp(1.4, 320, 880, 0.25), False),
		("sfx_anticipation", mix(chirp(1.6, 180, 720, 0.16), noise(1.6, 0.05, 0.2, 0.3)), False),
		("sfx_anticipation_start", noise(0.18, 0.2, 0.005, 0.08), False),
		("sfx_bigwin_coinloop", mix(noise(1.6, 0.08, 0.05, 0.05), tone(880, 1.6, 0.05, 0.1, 0.2)), True),
		("sfx_btn_general", noise(0.06, 0.25, 0.002, 0.03), False),
		("sfx_btn_spin", mix(tone(180, 0.12, 0.2, 0.005, 0.06), noise(0.05, 0.1)), False),
		("sfx_fs_respins", chirp(0.7, 440, 660, 0.2), False),
		("sfx_multiplier_combine_a", tone(520, 0.28, 0.2), False),
		("sfx_multiplier_combine_b", tone(620, 0.26, 0.2), False),
		("sfx_multiplier_explosion_a", noise(0.22, 0.28, 0.002, 0.12), False),
		("sfx_multiplier_explosion_b", noise(0.32, 0.26, 0.002, 0.16), False),
		("sfx_multiplier_explosion_c", noise(0.28, 0.24, 0.002, 0.14), False),
		("sfx_multiplier_landing", tone(300, 0.16, 0.22, 0.002, 0.08), False),
		("sfx_multiplier_reset", tone(240, 0.14, 0.16, 0.01, 0.08), False),
		("sfx_multiplier_up", chirp(0.32, 360, 720, 0.2), False),
		("sfx_multiplier_update", tone(480, 0.22, 0.18), False),
		("sfx_multiplier_win", chirp(0.55, 400, 980, 0.22), False),
		("sfx_reel_stop_1", tone(140, 0.08, 0.28, 0.001, 0.05), False),
		("sfx_reel_stop_2", tone(160, 0.08, 0.28, 0.001, 0.05), False),
		("sfx_reel_stop_3", tone(180, 0.08, 0.28, 0.001, 0.05), False),
		("sfx_reel_stop_4", tone(200, 0.08, 0.28, 0.001, 0.05), False),
		("sfx_reel_stop_5", tone(220, 0.08, 0.28, 0.001, 0.05), False),
		("sfx_royals_landing", tone(260, 0.12, 0.18), False),
		("sfx_scatter_reveal", chirp(0.45, 700, 1400, 0.2), False),
		("sfx_scatter_stop_1", chirp(0.18, 880, 1200, 0.22), False),
		("sfx_scatter_stop_2", chirp(0.2, 980, 1320, 0.22), False),
		("sfx_scatter_stop_3", chirp(0.22, 1100, 1500, 0.22), False),
		("sfx_scatter_stop_4", chirp(0.24, 1240, 1680, 0.22), False),
		("sfx_scatter_stop_5", chirp(0.26, 1400, 1860, 0.22), False),
		("sfx_scatter_win", chirp(0.6, 660, 1320, 0.22), False),
		("sfx_scatter_win_v2", chirp(0.7, 520, 1560, 0.2), False),
		("sfx_superfreespin", chirp(1.1, 240, 960, 0.22), False),
		("sfx_symbols_landing", tone(210, 0.09, 0.2, 0.001, 0.05), False),
		("sfx_wild_explode", noise(0.28, 0.3, 0.002, 0.16), False),
		("sfx_winlevel_end", tone(180, 0.4, 0.16, 0.02, 0.2), False),
		("sfx_winlevel_nice", chirp(0.35, 500, 800, 0.2), False),
		("sfx_winlevel_small", tone(440, 0.16, 0.18), False),
		("sfx_winlevel_standard", chirp(0.3, 360, 640, 0.18), False),
		("sfx_winlevel_substantial", chirp(0.5, 300, 900, 0.2), False),
		("sfx_youwon_panel", chirp(0.8, 280, 840, 0.2), False),
		("tumble_win_1", tone(392, 0.16, 0.18), False),
		("tumble_win_2", tone(440, 0.16, 0.18), False),
		("tumble_win_3", tone(494, 0.16, 0.18), False),
		("tumble_win_4", tone(523, 0.16, 0.18), False),
		("tumble_win_5", tone(587, 0.16, 0.18), False),
	]
	return clips


def main() -> None:
	clips = build_clips()
	gap = np.zeros(int(GAP * SR), dtype=np.float32)
	parts: list[np.ndarray] = []
	sprite: dict[str, list] = {}
	cursor = 0
	for name, audio, loop in clips:
		if parts:
			parts.append(gap)
			cursor += len(gap)
		start_ms = cursor / SR * 1000
		parts.append(audio)
		cursor += len(audio)
		entry = [round(start_ms, 3), round(len(audio) / SR * 1000, 3)]
		if loop:
			entry.append(True)
		sprite[name] = entry
	pcm = np.concatenate(parts)
	pcm = np.clip(pcm, -1, 1)
	samples = (pcm * 32767).astype(np.int16)
	wav_path = OUT_DIR / "sounds.wav"
	OUT_DIR.mkdir(parents=True, exist_ok=True)
	with wave.open(str(wav_path), "w") as handle:
		handle.setnchannels(1)
		handle.setsampwidth(2)
		handle.setframerate(SR)
		handle.writeframes(samples.tobytes())
	for ext, codec in (("ogg", ["-c:a", "libvorbis", "-q:a", "5"]), ("mp3", ["-c:a", "libmp3lame", "-q:a", "5"])):
		dest = OUT_DIR / f"sounds.{ext}"
		subprocess.run(["ffmpeg", "-y", "-i", str(wav_path), *codec, str(dest)], check=True, capture_output=True)
	for stale in ("sounds.ac3", "sounds.m4a", "sounds.wav"):
		path = OUT_DIR / stale
		if path.exists() and stale != "sounds.wav":
			path.unlink()
	wav_path.unlink(missing_ok=True)
	manifest = {
		"sprite": sprite,
		"src": ["./assets/audio/sounds.ogg", "./assets/audio/sounds.mp3"],
		"config": {name: {"volume": 1} for name, _, _ in clips},
	}
	(OUT_DIR / "sounds.json").write_text(json.dumps(manifest, indent=2) + "\n")
	print(f"wrote {len(clips)} clips, {cursor / SR:.1f}s")


if __name__ == "__main__":
	main()
