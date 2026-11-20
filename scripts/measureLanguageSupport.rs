use std::collections::BTreeMap;
use std::io::Write;
use std::process::{Command, Stdio};

struct Case {
    language: String,
    feature: String,
    source: String,
}

struct LanguageResult {
    name: String,
    passed: usize,
    total: usize,
    failures: Vec<String>,
}

fn decode_hex(input: &str) -> Result<String, String> {
    if input.len() % 2 != 0 {
        return Err("invalid sample encoding".into());
    }
    let bytes = (0..input.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&input[i..i + 2], 16).map_err(|_| "invalid sample encoding"))
        .collect::<Result<Vec<_>, _>>()?;
    String::from_utf8(bytes).map_err(|_| "sample is not UTF-8".into())
}

fn encode_hex(input: &str) -> String {
    input.as_bytes().iter().map(|byte| format!("{byte:02x}")).collect()
}

fn load_cases() -> Result<Vec<Case>, String> {
    include_str!("../tests/languageSupportSamples.tsv")
        .lines()
        .map(|line| {
            let mut fields = line.splitn(3, '\t');
            let language = fields.next().ok_or("missing language")?.to_owned();
            let feature = fields.next().ok_or("missing feature")?.to_owned();
            let source = decode_hex(fields.next().ok_or("missing sample")?)?;
            Ok(Case { language, feature, source })
        })
        .collect()
}

fn translate_all(cases: &[Case]) -> Result<Vec<Result<String, String>>, String> {
    let bridge = r#"
import { createInterface } from 'node:readline';
import { translate } from './src/webTranslator.js';
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  const split = line.indexOf('\t');
  const language = line.slice(0, split);
  const source = Buffer.from(line.slice(split + 1), 'hex').toString('utf8');
  try {
    const result = translate(source, language, 'rust');
    process.stdout.write(Buffer.from(`OK\t${result}`, 'utf8').toString('hex') + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(Buffer.from(`ERR\t${message}`, 'utf8').toString('hex') + '\n');
  }
}
"#;
    let mut child = Command::new("node")
        .args(["--input-type=module", "-e", bridge])
        .current_dir(std::env::current_dir().map_err(|error| error.to_string())?)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("could not start Node.js: {error}"))?;

    {
        let stdin = child.stdin.as_mut().ok_or("could not open Node.js input")?;
        for case in cases {
            writeln!(stdin, "{}\t{}", case.language, encode_hex(&case.source))
                .map_err(|error| format!("could not send benchmark sample: {error}"))?;
        }
    }
    drop(child.stdin.take());

    let output = child
        .wait_with_output()
        .map_err(|error| format!("could not read Node.js output: {error}"))?;
    if !output.status.success() {
        return Err(format!("Node.js bridge failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let responses = String::from_utf8(output.stdout)
        .map_err(|_| "Node.js returned invalid UTF-8".to_owned())?;
    let mut results = Vec::new();
    for line in responses.lines() {
        let decoded = decode_hex(line)?;
        if let Some(message) = decoded.strip_prefix("ERR\t") {
            results.push(Err(message.to_owned()));
        } else if let Some(code) = decoded.strip_prefix("OK\t") {
            results.push(Ok(code.to_owned()));
        } else {
            return Err("Node.js returned an invalid benchmark response".into());
        }
    }
    if results.len() != cases.len() {
        return Err(format!("expected {} translations, got {}", cases.len(), results.len()));
    }
    Ok(results)
}

fn matches(feature: &str, language: &str, output: &str, scalar_output: &str) -> bool {
    match feature {
        "scalar" => output.contains("let mut value = 1;") && output.contains("println!(\"{}\", value);") ,
        "reassignment" => output.contains("value = 2") && output.contains("println!(\"{}\", value);") ,
        "arithmetic" => output.contains("println!(\"{}\", (1 + (2 * 3)));") ,
        "booleanConditions" => output.contains("if ((true && false))") && output.contains("else") && output.contains("println!(\"{}\",") ,
        "ifElse" => output.contains("if (true)") && output.contains("else") && output.contains("println!(\"{}\",") ,
        "whileLoops" => output.contains("while (false)") && output.contains("println!(\"{}\",") ,
        "sequenceLiterals" => output.contains("vec![1, 2]"),
        "nestedSequences" => output.contains("vec![vec![1, 2], vec![3, 4]]"),
        "keyedLiterals" => output.contains("HashMap::from([(\"name\", \"Ada\")])"),
        "indexedReadWrite" => output.contains("items[0] = 2") && output.contains("println!(\"{}\", items[0]);"),
        "functions" => output.contains("fn add(") && output.contains("return (a + b)"),
        "forEach" => output.contains("for key in ") || output.contains("for item in "),
        "lineComments" | "blockComments" => output == scalar_output,
        _ => {
            let _ = language;
            false
        }
    }
}

fn feature_label(feature: &str) -> &str {
    match feature {
        "scalar" => "scalar",
        "reassignment" => "reassignment",
        "arithmetic" => "arithmetic",
        "booleanConditions" => "boolean conditions",
        "ifElse" => "if/else",
        "whileLoops" => "while loops",
        "sequenceLiterals" => "sequence literals",
        "nestedSequences" => "nested sequences",
        "keyedLiterals" => "keyed literals",
        "indexedReadWrite" => "indexed reads/writes",
        "functions" => "function definitions and returns",
        "forEach" => "for-each loops",
        "lineComments" => "line comments",
        "blockComments" => "block comments",
        _ => feature,
    }
}

fn language_label(language: &str) -> &str {
    match language {
        "bash" => "Bash",
        "csharp" => "C#",
        "cpp" => "C++",
        "dart" => "Dart",
        "go" => "Go",
        "java" => "Java",
        "js" => "JavaScript",
        "kotlin" => "Kotlin",
        "lua" => "Lua",
        "php" => "PHP",
        "perl" => "Perl",
        "python" => "Python",
        "r" => "R",
        "ruby" => "Ruby",
        "rust" => "Rust",
        "scala" => "Scala",
        "swift" => "Swift",
        "typescript" => "TypeScript",
        other => other,
    }
}

fn progress_badge(percent: usize) -> String {
    let color = if percent >= 80 { "2da44e" } else if percent >= 60 { "bf8700" } else { "cf222e" };
    format!(
        "![Progress](https://geps.dev/progress/{percent}?label={percent}%25&min=0&max=100&barColor={color})"
    )
}

fn replace_table(doc: &str, table_start: &str, next_section: &str, replacement: &str) -> Result<String, String> {
    let start = doc.find(table_start).ok_or_else(|| format!("could not find '{table_start}' in supported_languages.md"))?;
    let end = doc[start..]
        .find(next_section)
        .map(|offset| start + offset)
        .ok_or_else(|| format!("could not find '{next_section}' in supported_languages.md"))?;
    let mut updated = String::with_capacity(doc.len() + replacement.len());
    updated.push_str(&doc[..start]);
    updated.push_str(replacement);
    updated.push_str("\n\n");
    updated.push_str(&doc[end..]);
    Ok(updated)
}

fn update_supported_languages(results: &[LanguageResult]) -> Result<(), String> {
    let mut score_table = String::from("| Language | Passing features | Benchmark score |\n| --- | ---: | ---: |\n");
    let mut failure_table = String::from("| Language | Features |\n| --- | --- |\n");
    for result in results {
        let percent = (result.passed * 100 + result.total / 2) / result.total;
        score_table.push_str(&format!(
            "| {} | {}/{} | {} |\n",
            result.name,
            result.passed,
            result.total,
            progress_badge(percent)
        ));
        let failed_features = if result.failures.is_empty() {
            "None in this benchmark".to_owned()
        } else {
            result.failures.join(", ")
        };
        failure_table.push_str(&format!("| {} | {} |\n", result.name, failed_features));
    }

    let doc_path = std::env::current_dir()
        .map_err(|error| error.to_string())?
        .join("supported_languages.md");
    let doc = std::fs::read_to_string(&doc_path)
        .map_err(|error| format!("could not read supported_languages.md: {error}"))?;
    let doc = replace_table(
        &doc,
        "| Language | Passing features | Benchmark score |",
        "### Features that fail this benchmark",
        score_table.trim_end(),
    )?;
    let doc = replace_table(
        &doc,
        "| Language | Features |",
        "## Native target syntax checks",
        failure_table.trim_end(),
    )?;
    std::fs::write(&doc_path, doc)
        .map_err(|error| format!("could not update supported_languages.md: {error}"))
}

fn main() {
    let cases = match load_cases() {
        Ok(cases) => cases,
        Err(error) => {
            eprintln!("Could not load support benchmark: {error}");
            std::process::exit(1);
        }
    };
    let translations = match translate_all(&cases) {
        Ok(translations) => translations,
        Err(error) => {
            eprintln!("Could not run support benchmark: {error}");
            std::process::exit(1);
        }
    };

    let mut outputs = BTreeMap::new();
    for (case, translation) in cases.iter().zip(translations) {
        outputs.insert((case.language.as_str(), case.feature.as_str()), translation);
    }

    let mut languages: Vec<&str> = cases.iter().map(|case| case.language.as_str()).collect();
    languages.sort_unstable();
    languages.dedup();

    let mut report = Vec::new();
    for language in languages {
        let scalar_output = outputs
            .get(&(language, "scalar"))
            .and_then(|result| result.as_ref().ok())
            .map(String::as_str)
            .unwrap_or("");
        let mut passed = 0;
        let mut total = 0;
        let mut failures = Vec::new();
        for case in cases.iter().filter(|case| case.language == language) {
            total += 1;
            let result = outputs.get(&(language, case.feature.as_str())).expect("loaded case");
            let (ok, detail) = match result {
                Ok(output) if matches(&case.feature, language, output, scalar_output) => {
                    (true, "translated with expected Rust output".to_owned())
                }
                Ok(_) => (false, "output did not match the expected Rust feature".to_owned()),
                Err(error) => (false, error.clone()),
            };
            if ok {
                passed += 1;
            } else {
                failures.push(feature_label(&case.feature).to_owned());
                println!("{}: {}: {}", language_label(language), feature_label(&case.feature), detail);
            }
        }
        let percent = (passed * 100 + total / 2) / total;
        println!("{}\t{passed}/{total}\t{percent}%\t{}", language_label(language), progress_badge(percent));
        report.push(LanguageResult {
            name: language_label(language).to_owned(),
            passed,
            total,
            failures,
        });
    }
    report.sort_by(|left, right| left.name.cmp(&right.name));
    if let Err(error) = update_supported_languages(&report) {
        eprintln!("Could not update progress badges: {error}");
        std::process::exit(1);
    }
}
