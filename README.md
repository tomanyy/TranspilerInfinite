# Transpiler Infinite

A browser-based source-to-source translator for a small shared subset of Lua, JavaScript, TypeScript, Python, Ruby, Java, C#, Kotlin, Swift, Go, PHP, and Rust.

## Git

The provided `.git` path is read-only in this workspace, so repository metadata is stored in the ignored `.git-data` directory. Use the project wrapper for Git commands:

```sh
scripts/git.sh status
scripts/git.sh add .
scripts/git.sh commit -m "Initial commit"
```

## Run the website

Serve the project directory over HTTP so the browser can load its JavaScript modules:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Update the translator script

The typed translator source is `src/web-translator.ts`. The website loads the generated `src/web-translator.js` file. Regenerate it after editing the TypeScript source:

```sh
node scripts/build-translator.mjs
```

The language menus are populated from the `LANGUAGES` registry in `src/web-translator.ts`. Add a language there to make it available in both menus, and add its source normalization or output formatting when its syntax needs special handling.

## Rust library

The Rust library and its existing parser are in `src/lib.rs`. Check that library with:

```sh
cargo check
```

The browser translator currently handles a small shared subset of each listed language. It does not translate complete applications, framework code, or every language feature.
