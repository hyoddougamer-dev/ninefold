# 標 The logo

Chosen by Bruno on 2026-09-28: a gold brush ensō, left open, with the seated cultivator
inside, painted on a warm dark ground. The two pictures he sent are the sources, and
everything the game ships is made from them by one script:

    node tools/brand.mjs

- `source/icon.webp`: the icon, 1254px square.
- `source/wordmark.webp`: the icon beside NINEFOLD and "An idle cultivation game".
- `mark.png`: the icon lifted off its ground (transparent), for anything laid on a colour.
- `icon-512.png`: the server icon for Discord (`discord.yml`, the icon input).

What the script writes, and who reads it:

- `public/icon-192.png`, `icon-512.png`: the web app's icons, and its maskable icon (the
  ring is two thirds of the square, inside the circle a mask keeps).
- `public/apple-touch-icon.png`: an iPhone's home screen.
- `public/favicon.png`: a browser tab. The ring alone, since the figure is a smudge at 16px.
- `public/brand/wordmark.webp`: the testers' page, lifted off its ground.
- `assets/`: the Android launcher icon (adaptive, in layers) and the splash, which
  `.github/workflows/apk.yml` hands to `@capacitor/assets`. Before this the APK wore
  Capacitor's placeholder icon.

The earlier candidates (`logo-a-seal.svg`, `logo-b-enso.svg`, `logo-c-figure.svg`,
`wordmark.svg`) are kept as the record of what was considered.
