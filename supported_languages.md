# Supported languages

These 18 languages are available in the source and target menus. Support varies by syntax feature; the translator does not implement the full grammar or standard library of any language.

## Rust translation benchmark

The Rust executable in [scripts/measureLanguageSupport.rs](scripts/measureLanguageSupport.rs) measures representative source features by translating fixtures into Rust and checking expected output shapes. Languages have 12–14 checks, including the features available in each language's fixture set. The categories include scalar declaration/output, reassignment, arithmetic, boolean conditions, if/else, while, sequence and nested sequence literals, keyed literals, indexed reads/writes, function definition/return, for-each iteration, line comments, and applicable block comments. The benchmark checks emitted Rust patterns; it does not compile every generated sample.

These percentages describe this benchmark, not the share of each language's complete grammar that is supported. They measure source parsing and Rust code generation, not full semantic equivalence or every target backend. Run cargo run --bin measureLanguageSupport to reproduce the measurements and see which features fail.

| Language | Passing features | Benchmark score |
| --- | ---: | ---: |
| Bash | 12/12 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| C# | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| C++ | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Dart | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Go | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Java | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| JavaScript | 14/14 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Kotlin | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Lua | 14/14 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| PHP | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Perl | 12/12 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Python | 12/12 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| R | 12/12 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Ruby | 12/12 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Rust | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Scala | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Swift | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| TypeScript | 13/13 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |

### Features that fail this benchmark

| Language | Features |
| --- | --- |
| Bash | None in this benchmark |
| C# | None in this benchmark |
| C++ | None in this benchmark |
| Dart | None in this benchmark |
| Go | None in this benchmark |
| Java | None in this benchmark |
| JavaScript | None in this benchmark |
| Kotlin | None in this benchmark |
| Lua | None in this benchmark |
| PHP | None in this benchmark |
| Perl | None in this benchmark |
| Python | None in this benchmark |
| R | None in this benchmark |
| Ruby | None in this benchmark |
| Rust | None in this benchmark |
| Scala | None in this benchmark |
| Swift | None in this benchmark |
| TypeScript | None in this benchmark |

## Native target syntax checks

Generated snippets from a simple JavaScript input passed syntax checks for Lua, JavaScript, Python, Java, C++, Rust, Bash, and Perl. Go could not be checked because the installed toolchain could not find its standard fmt package. Toolchains for C#, Dart, Kotlin, PHP, R, Scala, and Swift were unavailable. This is a small target-side smoke check, not a full validation.

## Automated checks

Run both checks after changing the parser, generator, normalizers, or language registry:

    node tests/languageCoverage.test.js
    cargo run --bin measureLanguageSupport

The Rust benchmark reads its samples from tests/languageSupportSamples.tsv and calls the browser translator through Node.js. Add samples when adding a language, then update the measurements above.
