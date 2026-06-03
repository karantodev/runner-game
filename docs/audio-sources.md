# Audio sources & licensing

All shipped sound effects are **CC0 1.0 Universal** (public domain) from
[Kenney](https://kenney.nl) audio packs. CC0 imposes no attribution requirement;
this file is kept for provenance and reproducibility.

## P0 sound set (Milestone 6B)

| Target ID | Source pack | Author | License | Original file | Target files | Edits applied |
|---|---|---|---|---|---|---|
| `orchid_collect` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 1.0 | `glass_002.ogg` (124 ms) | `orchid_collect.ogg` / `.mp3` (~122 ms) | mono, peak-normalize −1 dBFS, encode ogg+mp3 |
| `jump` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 1.0 | `pluck_001.ogg` (102 ms) | `jump.ogg` / `.mp3` (~100 ms) | mono, normalize (−1.0 dB), encode ogg+mp3 |
| `land` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 1.0 | `impactSoft_medium_000.ogg` (118 ms) | `land.ogg` / `.mp3` (~115 ms) | mono, normalize, encode ogg+mp3 |
| `crouch` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 1.0 | `cloth4.ogg` (384 ms) | `crouch.ogg` / `.mp3` (~130 ms) | **trim 0→0.13 s**, fade-out 0.09–0.13 s, mono, normalize (+15.4 dB — source was quiet), encode ogg+mp3 |
| `hazard_hit` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 1.0 | `impactSoft_medium_002.ogg` (135 ms) | `hazard_hit.ogg` / `.mp3` (~132 ms) | mono, normalize, encode ogg+mp3 |
| `life_gain` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 1.0 | `confirmation_001.ogg` (290 ms) | `life_gain.ogg` / `.mp3` (~290 ms) | mono, normalize (−0.1 dB), encode ogg+mp3 |
| `combo_up` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 1.0 | `maximize_007.ogg` (186 ms) | `combo_up.ogg` / `.mp3` (~183 ms) | mono, normalize, encode ogg+mp3 |

## Notes

- **Dual format:** Chrome/Firefox decode Ogg Vorbis; Safari/iOS need MP3.
  `SoundSystem` keeps the `.ogg` URLs and picks `.ogg` or `.mp3` once per session
  via `canPlayType`. MP3 carries ~30 ms of silent encoder padding (harmless for
  short SFX, slightly longer reported duration).
- **Provisional picks (may be replaced):**
  - `crouch` — trimmed `cloth4`; if it doesn't read as a duck/air-whoosh in
    browser, swap for a dedicated CC0 whoosh (OpenGameArt).
  - `life_gain` — `confirmation_001` is a warm UI tone; can be swapped for a
    dedicated CC0 magic/heal shimmer later.
- **Reproduce:** download the pack, then (example for `orchid_collect`):
  `ffmpeg -i glass_002.ogg -ac 1 -af "volume=<g>dB" -c:a libvorbis -q:a 5 orchid_collect.ogg`
  (and `-c:a libmp3lame -q:a 5` for `.mp3`). `crouch` adds
  `atrim=0:0.13,afade=t=out:st=0.09:d=0.04` before `volume`.
- **Not used (audited, rejected as too arcade/UI for the garden theme):** Kenney
  UI Audio (clicks/switches), Kenney Digital Audio (laser/zap/phaser/powerUp),
  OpenGameArt "512 Sound Effects" (8-bit chiptune).
