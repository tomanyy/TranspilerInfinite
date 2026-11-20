# Transpiler Infinite

[![Supported languages](https://img.shields.io/badge/Supported_languages-View-2563eb?style=for-the-badge)](supported_languages.md)

A browser translator for small programs written in Lua, JavaScript, TypeScript, Python, Ruby, Java, C#, Kotlin, Swift, Go, PHP, Rust, Dart, Scala, and C++.

The translator supports a small shared syntax subset. See [supported_languages.md](supported_languages.md) for the complete list and support notes.

## Run the website

Serve the project directory over HTTP so the browser can load its JavaScript modules:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser.

## Update the translator

Edit [src/webTranslator.js](src/webTranslator.js), which is the browser's source module. Both language menus are generated from its `LANGUAGES` registry. Add one registry entry to reuse an existing syntax family, or add a normalizer when a language uses different syntax. No HTML menu edits are needed.

## Rust library

The Rust library is in `src/lib.rs`. Run `cargo check` to check it.

## Git

The provided `.git` path is read-only in this workspace, so repository metadata is stored in `.git-data`. Use the project wrapper for Git commands:

```sh
scripts/git.sh status
scripts/git.sh add .
scripts/git.sh commit -m "Describe the change"
```
