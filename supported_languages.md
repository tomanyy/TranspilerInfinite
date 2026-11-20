# Supported languages

These 18 languages are available in the source and target menus. Support varies by syntax feature; the translator does not implement the full grammar or standard library of any language.

## Rust translation benchmark

The Rust executable in [scripts/measureLanguageSupport.rs](scripts/measureLanguageSupport.rs) measures how many of 12–13 representative source features the parser accepts and translates into Rust output matching expected feature shapes. Languages with a native block comment form have 13 checks; the others have 12. The equally weighted categories are scalar declaration/output, reassignment, arithmetic, boolean conditions, if/else, while, sequence literals, keyed literals, indexed reads/writes, function definition/return, for-each iteration, line comments, and applicable block comments. The benchmark checks emitted Rust patterns; it does not compile every generated sample.

These percentages describe this benchmark, not the share of each language's complete grammar that is supported. They measure source parsing and Rust code generation, not full semantic equivalence or every target backend. Run cargo run --bin measureLanguageSupport to reproduce the measurements and see which features fail.

| Language | Passing features | Benchmark score |
| --- | ---: | ---: |
| Bash | 6/12 | ![Progress](https://geps.dev/progress/50?label=50%25&min=0&max=100&barColor=%23cf222e) |
| C# | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| C++ | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| Dart | 11/13 | ![Progress](https://geps.dev/progress/85?label=85%25&min=0&max=100&barColor=%232da44e) |
| Go | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| Java | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| JavaScript | 11/13 | ![Progress](https://geps.dev/progress/85?label=85%25&min=0&max=100&barColor=%232da44e) |
| Kotlin | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| Lua | 11/13 | ![Progress](https://geps.dev/progress/85?label=85%25&min=0&max=100&barColor=%232da44e) |
| PHP | 10/13 | ![Progress](https://geps.dev/progress/77?label=77%25&min=0&max=100&barColor=%23bf8700) |
| Perl | 5/12 | ![Progress](https://geps.dev/progress/42?label=42%25&min=0&max=100&barColor=%23cf222e) |
| Python | 10/12 | ![Progress](https://geps.dev/progress/83?label=83%25&min=0&max=100&barColor=%232da44e) |
| R | 9/12 | ![Progress](https://geps.dev/progress/75?label=75%25&min=0&max=100&barColor=%23bf8700) |
| Ruby | 9/12 | ![Progress](https://geps.dev/progress/75?label=75%25&min=0&max=100&barColor=%23bf8700) |
| Rust | 9/13 | ![Progress](https://geps.dev/progress/69?label=69%25&min=0&max=100&barColor=%23bf8700) |
| Scala | 8/13 | ![Progress](https://geps.dev/progress/62?label=62%25&min=0&max=100&barColor=%23bf8700) |
| Swift | 10/13 | ![Progress](https://geps.dev/progress/77?label=77%25&min=0&max=100&barColor=%23bf8700) |
| TypeScript | 10/13 | ![Progress](https://geps.dev/progress/77?label=77%25&min=0&max=100&barColor=%23bf8700) |

### Features that fail this benchmark

| Language | Features |
| --- | --- |
| Bash | arithmetic, sequence literals, keyed literals, indexed reads/writes, function definitions and returns, for-each loops |
| C# | sequence literals, keyed literals, function definitions and returns, for-each loops |
| C++ | sequence literals, keyed literals, function definitions and returns, for-each loops |
| Dart | function definitions and returns, for-each loops |
| Go | sequence literals, keyed literals, function definitions and returns, for-each loops |
| Java | sequence literals, keyed literals, function definitions and returns, for-each loops |
| JavaScript | function definitions and returns, for-each loops |
| Kotlin | sequence literals, keyed literals, function definitions and returns, for-each loops |
| Lua | function definitions and returns, for-each loops |
| PHP | keyed literals, function definitions and returns, for-each loops |
| Perl | boolean conditions, if/else, while loops, sequence literals, keyed literals, function definitions and returns, for-each loops |
| Python | function definitions and returns, for-each loops |
| R | keyed literals, function definitions and returns, for-each loops |
| Ruby | keyed literals, function definitions and returns, for-each loops |
| Rust | sequence literals, keyed literals, function definitions and returns, for-each loops |
| Scala | sequence literals, keyed literals, indexed reads/writes, function definitions and returns, for-each loops |
| Swift | keyed literals, function definitions and returns, for-each loops |
| TypeScript | sequence literals, function definitions and returns, for-each loops |

## Native target syntax checks

Generated snippets from a simple JavaScript input passed syntax checks for Lua, JavaScript, Python, Java, C++, Rust, Bash, and Perl. Go could not be checked because the installed toolchain could not find its standard fmt package. Toolchains for C#, Dart, Kotlin, PHP, R, Scala, and Swift were unavailable. This is a small target-side smoke check, not a full validation.

## Automated checks

Run both checks after changing the parser, generator, normalizers, or language registry:

    node tests/languageCoverage.test.js
    cargo run --bin measureLanguageSupport

The Rust benchmark reads its samples from tests/languageSupportSamples.tsv and calls the browser translator through Node.js. Add samples when adding a language, then update the measurements above.
