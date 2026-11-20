# Supported languages

These 18 languages are available in the source and target menus. Support varies by syntax feature; the translator does not implement the full grammar or standard library of any language.

## Rust translation benchmark

The Rust executable in [scripts/measureLanguageSupport.rs](scripts/measureLanguageSupport.rs) measures how many of 12–13 representative source features the parser accepts and translates into Rust output matching expected feature shapes. Languages with a native block comment form have 13 checks; the others have 12. The equally weighted categories are scalar declaration/output, reassignment, arithmetic, boolean conditions, if/else, while, sequence literals, keyed literals, indexed reads/writes, function definition/return, for-each iteration, line comments, and applicable block comments. The benchmark checks emitted Rust patterns; it does not compile every generated sample.

These percentages describe this benchmark, not the share of each language's complete grammar that is supported. They measure source parsing and Rust code generation, not full semantic equivalence or every target backend. Run cargo run --bin measureLanguageSupport to reproduce the measurements and see which features fail.

| Language | Passing features | Benchmark score |
| --- | ---: | ---: |
| Bash | 6/12 | $\color{#cf222e}{\text{50\%}}$ █████░░░░░ |
| C# | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| C++ | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| Dart | 11/13 | $\color{#2da44e}{\text{85\%}}$ ████████▌░ |
| Go | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| Java | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| JavaScript | 11/13 | $\color{#2da44e}{\text{85\%}}$ ████████▌░ |
| Kotlin | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| Lua | 11/13 | $\color{#2da44e}{\text{85\%}}$ ████████▌░ |
| PHP | 10/13 | $\color{#bf8700}{\text{77\%}}$ ███████▋░░ |
| Perl | 5/12 | $\color{#cf222e}{\text{42\%}}$ ████▏░░░░░ |
| Python | 10/12 | $\color{#2da44e}{\text{83\%}}$ ████████▎░ |
| R | 9/12 | $\color{#bf8700}{\text{75\%}}$ ███████▌░░ |
| Ruby | 9/12 | $\color{#bf8700}{\text{75\%}}$ ███████▌░░ |
| Rust | 9/13 | $\color{#bf8700}{\text{69\%}}$ ██████▉░░░ |
| Scala | 8/13 | $\color{#bf8700}{\text{62\%}}$ ██████▏░░░ |
| Swift | 10/13 | $\color{#bf8700}{\text{77\%}}$ ███████▋░░ |
| TypeScript | 10/13 | $\color{#bf8700}{\text{77\%}}$ ███████▋░░ |

### Features that fail this benchmark

| Language | Features |
| --- | --- |
| Bash | Arithmetic output, sequence and keyed literals, indexed access, functions, for-each loops |
| C# | Sequence and keyed literals, functions, for-each loops |
| C++ | Sequence and keyed literals, functions, for-each loops |
| Dart | Functions, for-each loops |
| Go | Sequence and keyed literals, functions, for-each loops |
| Java | Sequence and keyed literals, functions, for-each loops |
| JavaScript | Functions, for-each loops |
| Kotlin | Sequence and keyed literals, functions, for-each loops |
| Lua | Functions and for-each loops in Rust output |
| PHP | Keyed literals, functions, for-each loops |
| Perl | Boolean conditions, if/else, while, sequences and keyed literals, functions, for-each loops |
| Python | Functions, for-each loops |
| R | Keyed literals, functions, for-each loops |
| Ruby | Keyed literals, functions, for-each loops |
| Rust | Sequence and keyed literals, functions, for-each loops |
| Scala | Sequences, keyed literals, indexed access, functions, for-each loops |
| Swift | Keyed literals, functions, for-each loops |
| TypeScript | Sequences, functions, for-each loops |

## Native target syntax checks

Generated snippets from a simple JavaScript input passed syntax checks for Lua, JavaScript, Python, Java, C++, Rust, Bash, and Perl. Go could not be checked because the installed toolchain could not find its standard fmt package. Toolchains for C#, Dart, Kotlin, PHP, R, Scala, and Swift were unavailable. This is a small target-side smoke check, not a full validation.

## Automated checks

Run both checks after changing the parser, generator, normalizers, or language registry:

    node tests/languageCoverage.test.js
    cargo run --bin measureLanguageSupport

The Rust benchmark reads its samples from tests/languageSupportSamples.tsv and calls the browser translator through Node.js. Add samples when adding a language, then update the measurements above.
