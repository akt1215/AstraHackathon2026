# Cinematic loft material sources

Downloaded September 10, 2026 from Poly Haven. All source material assets are **CC0-1.0**. Poly Haven explicitly permits redistribution of its raw assets: https://polyhaven.com/license . The website's unrelated copy, logos and preview renders are not included.

| Asset | Authors | Source | Tile dimensions |
|---|---|---|---|
| Wood Floor | Dimitrios Savva | https://polyhaven.com/a/wood_floor | approximately 1.7 × 1.7 m |
| Rough Linen | colormass (photography), Rico Cilliers (processing) | https://polyhaven.com/a/rough_linen | approximately 0.271 × 0.271 m |
| Plastered Wall | Amal Kumar | https://polyhaven.com/a/plastered_wall | approximately 2 × 2 m |
| Brick Wall 001 | Dimitrios Savva (photography), Rob Tuytel (processing) | https://polyhaven.com/a/brick_wall_001 | 3 × 3 m |
| Rooftop Night | See linked source | https://polyhaven.com/a/rooftop_night | 1K HDR environment |

The four material sets contain unmodified 1K JPEG albedo, OpenGL tangent-space normal and packed ARM maps. ARM channels are red=ambient occlusion, green=roughness, blue=metallic. Color maps use sRGB; normal and ARM data require linear sampling. The blue linen albedo may be omitted for a tinted upholstery material while retaining its normal and ARM detail.

`manifest.json` records direct original file URLs, exact byte counts, SHA256 hashes and source dimensions. `art/fetch-materials.py` reproduces the downloads and checks the publisher's MD5 checksums; SHA256 hashes are independently recorded after download. The 13 files total 9,480,575 bytes. No API key or account is needed to serve these local assets in the game.
