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
