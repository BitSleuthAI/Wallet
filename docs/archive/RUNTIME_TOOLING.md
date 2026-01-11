# Runtime and Tooling Snapshot

This project is a React Native app built with Expo. The table below summarizes the runtimes and toolchains currently configured in the repository.

| Runtime / Tool | Status | Source |
| --- | --- | --- |
| Node.js / npm | npm is pinned via `packageManager` to `npm@10.2.4`; Node.js version is inherited from the environment (not explicitly pinned in repo). | `package.json` |
| Expo SDK | Expo SDK `54.0.23` with React Native `0.81.5` and React `19.1.0`. | `package.json` |
| Android / Java | EAS Android builds run on the `ubuntu-22.04-jdk-17-ndk-r25b` image (JDK 17). | `eas.json` |
| iOS / Swift | Xcode project sets `SWIFT_VERSION = 5.0`. | `ios/BitSleuthWallet.xcodeproj/project.pbxproj` |
| Python | Not in use (no Python runtime configured). | — |
| Ruby | Not in use (no Ruby toolchain configured). | — |
| Rust | Not in use (no Rust toolchain configured). | — |
| Go | Not in use (no Go toolchain configured). | — |
| Bun | Not in use (no Bun toolchain configured). | — |
| PHP | Not in use (no PHP toolchain configured). | — |

