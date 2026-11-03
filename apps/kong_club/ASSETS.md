# Kong Club asset swaps

All art, sound, animation, logo, and font paths live in [`src/assets/manifest.ts`](src/assets/manifest.ts). Game code asks for a logical key such as `logo` or `sfx_btn_spin`. It does not contain file paths.

Paths are relative (`/assets/...`) and are resolved with the Vite base, including a relative `./` base. There is no Stake Engine loader in this table.

Each entry has a typed fallback under `static/assets/placeholders/`. If a file 404s or times out, the loader substitutes that placeholder and continues. A missing file does not crash the spine or sprite view, and font loads give up after 2.5 seconds.

Open the game with `?assetPlaceholders=1` to boot entirely on placeholders.

## Swap a file

1. Find the logical key in `src/assets/manifest.ts`.
2. Either replace the file at the current `src`, or change that one `src` to the new relative path.
3. Do not edit components. Pixi still loads the same runtime key (`title_art`, `LE`, `sound`, …).

| What you are swapping       | Key                                                                             | Current file                                                       |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Logo                        | `logo`                                                                          | `static/assets/sprites/monkeySymbols/title_art.png`                |
| Symbol                      | `symbol_*` (`symbol_ST`, `symbol_LE`, …)                                        | `static/assets/sprites/monkeySymbols/<NAME>.png`                   |
| Base background             | `bg_base`                                                                       | `static/assets/sprites/background/jungle_bg.png`                   |
| See bonus screen            | `bg_bonus_see`                                                                  | `static/assets/gg-ui/bg-desktop-see.png`                           |
| Hear bonus screen           | `bg_bonus_hear`                                                                 | `static/assets/gg-ui/bg-desktop-hear.png`                          |
| Mystery Bonus (pick) screen | `bg_bonus_pick`                                                                 | `static/assets/gg-ui/bg-desktop-gamble.png`                        |
| Sound pack                  | `sfx_sprite`                                                                    | `static/assets/audio/sounds.json` plus `sounds.ogg` / `sounds.mp3` |
| One cue                     | `sfx_*` or `music_freespin`                                                     | sprite name inside the pack                                        |
| Base music                  | `music_base`                                                                    | `static/assets/audio/bgm_main.mp3`                                 |
| Feature Spin music          | `music_feature_spin`                                                            | `static/assets/audio/bgm_feature_spin.mp3`                         |
| Max-win music               | `music_win_max`                                                                 | `static/assets/audio/bgm_winlevel_max.mp3`                         |
| Coin tick                   | `sfx_coin_tick`                                                                 | `static/assets/audio/coin_tick.wav`                                |
| Big-win spine               | `win_anim_bigwin`                                                               | `static/assets/spines/bigwin/`                                     |
| Big-win plate               | `win_anim_big` (also `_super`, `_mega`, `_epic`)                                | `static/assets/monkey/ui/win_popup_*.png`                          |
| UI font                     | `font_fredoka_one`, `font_fredoka`, `font_inter`, `font_lilita`, `font_rubik_*` | `static/assets/fonts/`                                             |

To drop in a new logo, replace `title_art.png` or set `logo.src` to the new png. To drop in a new sound pack, replace `sounds.ogg` and `sounds.mp3`, or point `sfx_sprite.src` at the new howler JSON. Cue keys match the sprite names in that JSON. Standalone music is read from `music_base`, `music_feature_spin`, and `music_win_max` when playback starts.

## Fallbacks

| Kind                     | Placeholder                                              |
| ------------------------ | -------------------------------------------------------- |
| texture (png, svg, webp) | `static/assets/placeholders/pixel.png`                   |
| spritesheet              | `static/assets/placeholders/sheet.json`                  |
| spine                    | `static/assets/placeholders/spine/`                      |
| bitmap font              | `static/assets/placeholders/font.xml`                    |
| sound pack               | `static/assets/placeholders/sounds.json`                 |
| music or one-shot wav    | `static/assets/placeholders/silent.wav`                  |
| CSS font                 | no file; the face is skipped and the next family is used |

## Math profile

Mode names, costs, RTP, max win, and Mystery Bonus odds are not hardcoded. They come from [`src/stories/data/math_books/index.json`](src/stories/data/math_books/index.json). `node scripts/generate-math-profile.mjs` writes [`src/game/mathProfile.json`](src/game/mathProfile.json), and the rules, paytable, and buy screen read that file.

The dev server and `pnpm build` regenerate the profile before the app bundles. A book file is measured only when it has at least `minBooksToMeasure` books (1000) or the mode sets `measureFromBooks`. The short local cache does not replace the declared numbers. The final 250k publish does.

Drop-in steps, with no source edits:

1. Replace `index.json` with the publish index (mode id, label, cost, and the odds labels for `bonus_pick`).
2. Put each mode's books at `src/stories/data/math_books/books_<mode>.json` or `.cache/math-books/books_<mode>.json`. `bonus_pick` also accepts `books_bonus_gamble.json`.
3. Optional: `lookUpTable_<mode>_0.csv` (`id,weight,payout`) so RTP is measured. Payouts are base-bet multiples, and RTP is the weighted payout divided by the mode cost. Without a lookup table, RTP stays the value in `index.json`.
4. Run `pnpm --dir apps/kong_club math:profile` (or `pnpm build`). Max win becomes the highest `payoutMultiplier` in the books. Mystery Bonus odds are the share of books whose `kongClubMode` state matches the `odds` entries (`noBonus`, `start_bonus_hear`, `start_bonus_madness`).

## Check

```bash
pnpm --dir apps/kong_club test:assets
```

That checks every asset key resolves, checks the math profile matches `index.json` and that a book sample rewrites odds, RTP, and max win, then boots the dev server with `?assetPlaceholders=1` and waits until the game reports loaded.
