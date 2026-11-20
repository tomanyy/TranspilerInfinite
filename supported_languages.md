# Supported languages

These 18 languages are available in the source and target menus. Support varies by syntax feature; the translator does not implement the full grammar or standard library of any language.

## Rust translation benchmark

The Rust executable in [scripts/measureLanguageSupport.rs](scripts/measureLanguageSupport.rs) measures representative source features by translating fixtures into Rust and checking expected output shapes. Languages have 76–79 checks, including the features available in each language's fixture set. The categories include scalar declaration/output, reassignment, arithmetic, comparisons, comparison operators, unary minus, negative arithmetic, string literals, string escapes, string concatenation, string comparison, boolean conditions, if/else, else-if chains, nested and deeply nested ifs, ifs without else, comparison conditions, logical or, mixed boolean logic, if-inside-while, while-inside-if, while and nested loops, empty if/while bodies, sequence and nested-sequence literals, string sequence literals, empty and keyed collections, indexed reads/writes and reads, function definitions, nested calls, function calls in expressions/conditions and nested call arguments, nested property access, for-each iteration, line comments, comment-only programs, comments in blocks and between statements, inline comments, applicable block comments, hello world, empty programs, numeric and float literals, float arithmetic, subtraction, division, multiplication, operator precedence, multiple prints, variable swapping, and declaration from a variable. Additional expression and branch checks cover logical and, integer division, nested arithmetic, three-variable arithmetic, string equality and inequality, empty strings, escaped quotes, strings with spaces, float comparisons, comparisons with variables, nested parentheses, addition/multiplication/division chains, negative literals, ifs with two statements, if/else bodies with two statements, two sequential ifs, three nested ifs, and while loops containing if/else. The benchmark checks emitted Rust patterns; it does not compile every generated sample.

These percentages describe this benchmark, not the share of each language's complete grammar that is supported. They measure source parsing and Rust code generation, not full semantic equivalence or every target backend. Run cargo run --bin measureLanguageSupport to reproduce the measurements and see which features fail.

| Language | Passing features | Benchmark score |
| --- | ---: | ---: |
| Bash | 75/76 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| C# | 77/77 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| C++ | 77/77 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Dart | 78/78 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Go | 76/77 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| Java | 77/77 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| JavaScript | 78/79 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| Kotlin | 78/78 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Lua | 78/79 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| PHP | 79/79 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Perl | 76/77 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| Python | 77/77 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| R | 76/76 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Ruby | 77/77 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| Rust | 76/77 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| Scala | 77/78 | ![Progress](https://geps.dev/progress/99?label=99%25&min=0&max=100&barColor=2da44e) |
| Swift | 78/78 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |
| TypeScript | 78/78 | ![Progress](https://geps.dev/progress/100?label=100%25&min=0&max=100&barColor=2da44e) |

### Features that fail this benchmark

| Language | Features |
| --- | --- |
| Bash | nested function calls |
| C# | None in this benchmark |
| C++ | None in this benchmark |
| Dart | None in this benchmark |
| Go | else-if chains |
| Java | None in this benchmark |
| JavaScript | nested property access |
| Kotlin | None in this benchmark |
| Lua | nested property access |
| PHP | None in this benchmark |
| Perl | nested function calls |
| Python | None in this benchmark |
| R | None in this benchmark |
| Ruby | None in this benchmark |
| Rust | else-if chains |
| Scala | nested function calls |
| Swift | None in this benchmark |
| TypeScript | None in this benchmark |

## Native target syntax checks

Generated snippets from a simple JavaScript input passed syntax checks for Lua, JavaScript, Python, Java, C++, Rust, Bash, and Perl. Go could not be checked because the installed toolchain could not find its standard fmt package. Toolchains for C#, Dart, Kotlin, PHP, R, Scala, and Swift were unavailable. This is a small target-side smoke check, not a full validation.

## Automated checks

Run the coverage suite after changing the parser, generator, normalizers, or language registry:

    node tests/languageCoverage.test.js

That suite invokes the Rust benchmark with `--check`, so the expected output matchers live only in scripts/measureLanguageSupport.rs. To refresh the score and failure tables above, run the benchmark without `--check`:

    cargo run --bin measureLanguageSupport

The Rust benchmark reads its samples from tests/languageSupportSamples.tsv and calls the browser translator through Node.js. Add samples when adding a language, then update the measurements above.
