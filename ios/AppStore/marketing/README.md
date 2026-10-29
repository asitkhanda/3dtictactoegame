# App Store marketing slides

`node build.mjs` renders eight slides for iPhone (1320×2868) and iPad (2064×2752) into `out/`
using headless Chrome (macOS, `/Applications/Google Chrome.app`) and the system font SF Pro Rounded.
Pass a slide number to render one, e.g. `node build.mjs 4`.

Slides 1, 2, 3 and 5 frame real gameplay from `raw/phone` and `raw/pad` (gitignored). Capture them
with a Debug build in the simulator (write the PNGs to a temp folder, then copy; `simctl` can't
write inside ~/Downloads):

```bash
xcrun simctl launch <device> com.twistedtac.TwistedTac -simulateRelease YES -previewOnline midgame   # b3
xcrun simctl launch <device> com.twistedtac.TwistedTac -previewBoard 5                              # b5 (4, 8 and 5f also used)
xcrun simctl launch <device> com.twistedtac.TwistedTac -simulateRelease YES -previewOnline waiting  # room
xcrun simctl launch <device> com.twistedtac.TwistedTac -simulateRelease YES -previewOnline win      # win
```

Wait about 25 seconds before each screenshot: the 3D board renders black until RealityKit warms up.
Slides 2 and 6 show larger boards, so they carry an "Optional in-app purchase" tag (App Store
guideline 2.3.2). App Store Connect's 6.3" slot wants 1206×2622, so resize the iPhone slides with
`sips -z 2622 1206`.

## Product page header and search results
`node build-assets.mjs` renders the two creative assets for the product page:
`out/header-3840x1646.png` (Header, 21:9) and `out/search-3840x2560.jpg` (Search Results, 3:2).
The Header slot only accepted PNG, so the header is converted from the JPEG with
`sips -s format png` (no alpha channel). On the iPhone product page Apple crops the header to
roughly its middle 64%, so the headline and boards are kept in the centre. Check any change with
the Preview button in App Store Connect. The header deliberately shows no completed row: in this
3D game a row on one board only claims a layer, which a first-time viewer would misread as a win.
