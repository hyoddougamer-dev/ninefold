# 測 The testers' signing key

`debug.keystore` signs the APK that testers download from the `testers` release.

It is here, in the open, on purpose. Android refuses to install an update over an app
signed with a different key, and the key GitHub Actions invents for a debug build is a
new one on every run: every tester who installed last week's APK would have had to
uninstall it, and lose nothing but patience, before installing this week's. With one key
kept in the repository, every test build installs over the last.

It is a test key and nothing more. Its passwords are Android's own debug defaults
(`android` / `androiddebugkey` / `android`), anybody can read it, and **it must never
sign anything that goes to the Play Store.** A store release is signed with a private
key held by Google Play App Signing, and that key never touches this repository.

    SHA-256  33:BE:AD:22:EF:04:7A:08:74:15:85:78:9E:3E:21:AF:D3:CE:74:11:F1:57:29:BC:E2:3B:0B:3B:33:B2:4F:69
