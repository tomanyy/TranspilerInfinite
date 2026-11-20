# Transpiler Infinite

Universal code-to-code transpiler for translating between (almot) any programming languages.

**Website:** [Transpiler Infinite](https://tomanyy.github.io/transpiler-infinite/)

The translator supports a shared syntax subset, including Lua table constructors, basic Lua functions and generic loops, return statements, comments, and indexed table reads and writes. See [supported_languages.md](supported_languages.md) for the complete language list and support notes.

## Run the website

Serve the project directory over HTTP so the browser can load its JavaScript modules:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser.

## Update the translator

The browser entry point is [src/webTranslator.js](src/webTranslator.js). Translator code is split into [src/languageRegistry.js](src/languageRegistry.js), [src/sourceNormalizers.js](src/sourceNormalizers.js), [src/lexer.js](src/lexer.js), [src/parser.js](src/parser.js), and [src/codeGenerator.js](src/codeGenerator.js). Both language menus use the registry. To add a language, add its configuration there and reuse an existing source family and output syntax style where possible; add a normalizer only when its source syntax differs. No HTML menu edits are needed.

Run `node tests/languageCoverage.test.js` and `cargo run --bin measureLanguageSupport` after changes. The coverage suite checks every source language against every target language for basic statements and control flow, checks comments, and exercises Lua tables and functions. The Rust feature benchmark checks how each source language translates to Rust across a defined syntax set; it calls the browser translator through Node.js and refreshes the score and failure tables in [supported_languages.md](supported_languages.md). Add benchmark samples to [tests/languageSupportSamples.tsv](tests/languageSupportSamples.tsv) when adding a language.

## GitHub Pages

The workflow in `.github/workflows/deployPages.yml` publishes the website whenever changes are pushed to `main`. In the repository's **Settings → Pages**, set the publishing source to **GitHub Actions**. After the first successful workflow run, the site will be available at `https://tomanyy.github.io/transpiler-infinite/`.

## Rust library

The Rust library is in `src/lib.rs`. Run `cargo check` to check it.

## Git

The provided `.git` path is read-only in this workspace, so repository metadata is stored in `.git-data`. Use the project wrapper for Git commands:

```sh
scripts/git.sh status
scripts/git.sh add .
scripts/git.sh commit -m "Describe the change"
```
