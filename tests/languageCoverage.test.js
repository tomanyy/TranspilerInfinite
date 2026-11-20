import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { LANGUAGES, translate } from "../src/webTranslator.js";

const sourceSamples = {
  lua: "local value = 1\nprint(value)",
  js: "let value = 1;\nconsole.log(value);",
  typescript: "let value: number = 1;\nconsole.log(value);",
  python: "value = 1\nprint(value)",
  ruby: "value = 1\nputs value",
  java: "var value = 1;\nSystem.out.println(value);",
  csharp: "var value = 1;\nConsole.WriteLine(value);",
  kotlin: "val value = 1\nprintln(value)",
  swift: "let value = 1\nprint(value)",
  go: "value := 1\nfmt.Println(value)",
  php: "$value = 1;\nprint($value);",
  rust: "let value = 1;\nprintln!(value);",
  dart: "var value = 1;\nprint(value);",
  scala: "val value = 1\nprintln(value)",
  cpp: "auto value = 1;\nstd::cout << value << std::endl;",
  bash: "value=1\necho $value",
  perl: "my $value = 1;\nprint $value;",
  r: "value <- 1\nprint(value)",
};

const controlFlowSamples = {
  lua: "if true then\n  print(1)\nend\nwhile false do\n  print(2)\nend",
  js: "if (true) {\n  console.log(1);\n}\nwhile (false) {\n  console.log(2);\n}",
  typescript: "if (true) {\n  console.log(1);\n}\nwhile (false) {\n  console.log(2);\n}",
  python: "if True:\n    print(1)\nwhile False:\n    print(2)",
  ruby: "if true\n  puts 1\nend\nwhile false\n  puts 2\nend",
  java: "if (true) {\n  System.out.println(1);\n}\nwhile (false) {\n  System.out.println(2);\n}",
  csharp: "if (true) {\n  Console.WriteLine(1);\n}\nwhile (false) {\n  Console.WriteLine(2);\n}",
  kotlin: "if (true) {\n  println(1)\n}\nwhile (false) {\n  println(2)\n}",
  swift: "if true {\n  print(1)\n}\nwhile false {\n  print(2)\n}",
  go: "if true {\n  fmt.Println(1)\n}\nfor false {\n  fmt.Println(2)\n}",
  php: "if (true) {\n  print(1);\n}\nwhile (false) {\n  print(2);\n}",
  rust: "if true {\n  println!(1);\n}\nwhile false {\n  println!(2);\n}",
  dart: "if (true) {\n  print(1);\n}\nwhile (false) {\n  print(2);\n}",
  scala: "if (true) {\n  println(1)\n}\nwhile (false) {\n  println(2)\n}",
  cpp: "if (true) {\n  cout << 1 << endl;\n}\nwhile (false) {\n  cout << 2 << endl;\n}",
  bash: "if true; then\n  echo 1\nfi\nwhile false; do\n  echo 2\ndone",
  perl: "if (1) {\n  print 1;\n}\nwhile (0) {\n  print 2;\n}",
  r: "if (TRUE) {\n  print(1)\n}\nwhile (FALSE) {\n  print(2)\n}",
};

test("every supported source translates to every supported target", () => {
  assert.deepEqual(Object.keys(sourceSamples).sort(), LANGUAGES.map(({ id }) => id).sort());

  for (const source of LANGUAGES) {
    for (const target of LANGUAGES) {
      assert.doesNotThrow(() => {
        const result = translate(sourceSamples[source.id], source.id, target.id);
        assert.ok(result.trim(), `${source.id} to ${target.id} returned empty output`);
        assert.match(result, /1/);
        assert.match(result, /value/);
      }, `${source.id} to ${target.id}`);
    }
  }
});

test("every supported source handles conditionals and while loops", () => {
  assert.deepEqual(Object.keys(controlFlowSamples).sort(), LANGUAGES.map(({ id }) => id).sort());

  for (const source of LANGUAGES) {
    for (const target of LANGUAGES) {
      assert.doesNotThrow(() => {
        const result = translate(controlFlowSamples[source.id], source.id, target.id);
        assert.ok(result.trim());
        assert.match(result, /1/);
        assert.match(result, /2/);
      }, `${source.id} to ${target.id}`);
    }
  }
});

test("all benchmark fixtures translate with their advertised feature", () => {
  const rows = fs.readFileSync(new URL("./languageSupportSamples.tsv", import.meta.url), "utf8")
    .trim().split(/\r?\n/).map((line) => {
      const [language, feature, hex] = line.split("\t");
      return { language, feature, source: Buffer.from(hex, "hex").toString("utf8") };
    });

  assert.ok(rows.length >= LANGUAGES.length * 10, "benchmark suite should cover multiple features per language");
  for (const row of rows) {
    const output = translate(row.source, row.language, "rust");
    assert.ok(output.trim(), `${row.language} ${row.feature} returned empty output`);
    if (row.feature === "scalar") assert.match(output, /let mut value = 1;[\s\S]*println!\("\{\}", value\);/, `${row.language} scalar`);
    if (row.feature === "reassignment") assert.match(output, /value = 2;[\s\S]*println!\("\{\}", value\);/, `${row.language} reassignment`);
    if (row.feature === "arithmetic") assert.match(output, /println!\("\{\}", \(1 \+ \(2 \* 3\)\)\);/, `${row.language} arithmetic`);
    if (["booleanConditions", "ifElse"].includes(row.feature)) {
      assert.match(output, /if \([\s\S]*\)[\s\S]*println!\("\{\}", 1\);[\s\S]*else[\s\S]*println!\("\{\}", 2\);/, `${row.language} ${row.feature}`);
    }
    if (row.feature === "whileLoops") assert.match(output, /while \([\s\S]*\)[\s\S]*println!\("\{\}", 1\);/, `${row.language} while loop`);
    if (row.feature === "sequenceLiterals") assert.match(output, /vec!\[/, `${row.language} sequence`);
    if (row.feature === "nestedSequences") assert.match(output, /vec!\[vec!\[1, 2\], vec!\[3, 4\]\]/, `${row.language} nested sequence`);
    if (row.feature === "keyedLiterals") assert.match(output, /HashMap::from\(/, `${row.language} keyed literal`);
    if (row.feature === "functions") assert.match(output, /fn add\([\s\S]*return \(a \+ b\);/, `${row.language} function`);
    if (row.feature === "forEach") assert.match(output, /for item in items|for key in items/, `${row.language} foreach`);
    if (row.feature === "indexedReadWrite") assert.match(output, /items\[0\] = 2/, `${row.language} indexed write`);
  }
});

test("nested tables, typed function parameters, and language-native iteration translate", () => {
  const lua = translate("local values = {1, 2}\nfor key in pairs(values) do print(key) end", "lua", "rust");
  assert.match(lua, /for key in values\.iter\(\)\.enumerate\(\)/);
  assert.match(lua, /println!\("\{\}", key\)/);

  const typescript = translate(
    "function add(a: number, b: number): number { return a + b; }\nconsole.log(add(1, 2));",
    "typescript", "rust",
  );
  assert.match(typescript, /fn add\(a: i64, b: i64\) -> i64/);
  assert.match(typescript, /return \(a \+ b\);/);

  const python = translate("items = [1, 2]\nfor item in items:\n    print(item)", "python", "rust");
  assert.match(python, /for item in items/);
  assert.match(python, /println!\("\{\}", item\)/);
});

test("Rust printing and Bash assignment use valid idiomatic forms", () => {
  const rust = translate(sourceSamples.js, "js", "rust");
  assert.match(rust, /println!\("\{\}", value\);/);

  const bash = translate(sourceSamples.js, "js", "bash");
  assert.match(bash, /^value=1\necho \$value$/);
});

test("Lua and R one-based sequence indexes convert for zero-based targets", () => {
  const r = translate("items <- c(0)\nitems[1] <- 2\nprint(items[1])", "r", "js");
  assert.match(r, /items\[0\] = 2/);
  assert.match(r, /console\.log\(items\[0\]\)/);
});

test("Rust format-string printing and R vectors translate to Rust", () => {
  const rustInput = translate('let mut value = 1;\nprintln!("{}", value);', "rust", "js");
  assert.match(rustInput, /console\.log\(value\)/);

  const rInput = translate("items <- c(0)\nitems[1] <- 2\nprint(items[1])", "r", "rust");
  assert.match(rInput, /vec!\[0\]/);
  assert.match(rInput, /items\[0\] = 2/);
  assert.match(rInput, /println!\("\{\}", items\[0\]\)/);
});

test("comments are skipped correctly for every supported source language", () => {
  const commentMarkers = {
    lua: "--", js: "//", typescript: "//", python: "#", ruby: "#", java: "//",
    csharp: "//", kotlin: "//", swift: "//", go: "//", php: "//", rust: "//",
    dart: "//", scala: "//", cpp: "//", bash: "#", perl: "#", r: "#",
  };

  for (const language of LANGUAGES) {
    const source = `${commentMarkers[language.id]} ignored comment\n${sourceSamples[language.id]}`;
    assert.equal(translate(source, language.id, "js"), translate(sourceSamples[language.id], language.id, "js"), language.id);
  }

  for (const language of ["js", "typescript", "java", "csharp", "kotlin", "swift", "go", "php", "rust", "dart", "scala", "cpp"]) {
    assert.equal(
      translate(`/* block comment */\n${sourceSamples[language]}`, language, "js"),
      translate(sourceSamples[language], language, "js"),
      language,
    );
  }
});

test("Lua tables support positional, keyed, nested, read, and write forms", () => {
  const source = [
    "local person = {\n  name = \"Ada\",\n  scores = {10, 20}\n}",
    "person.scores[1] = 11",
    "print(person.name)",
  ].join("\n");

  const javascript = translate(source, "lua", "js");
  assert.match(javascript, /name: "Ada"/);
  assert.match(javascript, /scores: \[10, 20\]/);
  assert.match(javascript, /person\.scores\[0\] = 11/);
  assert.match(javascript, /console\.log\(person\.name\)/);

  const python = translate(source, "lua", "python");
  assert.match(python, /"name": "Ada"/);
  assert.match(python, /person\.scores\[0\] = 11/);
});

test("Lua functions, generic loops, multi-value returns, and comments translate", () => {
  const source = [
    "-- line comment",
    "--[[ block comment ]]",
    "function pairsByKeys(t, f)",
    "  local a = {}",
    "  for n in pairs(t) do table.insert(a, n) end",
    "  table.sort(a, f)",
    "  local i = 0 -- iterator variable",
    "  local iter = function()",
    "    i = i + 1",
    "    if a[i] == nil then return nil",
    "    else return a[i], t[a[i]]",
    "    end",
    "  end",
    "  return iter",
    "end",
  ].join("\n");

  const javascript = translate(source, "lua", "js");
  assert.match(javascript, /function pairsByKeys\(t, f\)/);
  assert.match(javascript, /for \(const n of Object\.keys\(t\)\)/);
  assert.match(javascript, /a\.push\(n\)/);
  assert.match(javascript, /return \[a\[\(i - 1\)\], t\[a\[\(i - 1\)\]\]\]/);
  assert.doesNotMatch(javascript, /line comment|block comment|iterator variable/);
  assert.doesNotThrow(() => new Function(javascript));

  const python = translate(source, "lua", "python");
  assert.match(python, /def pairsByKeys\(t, f\):/);
  assert.match(python, /for n in t\.keys\(\):/);
  assert.match(python, /def iter\(\):/);
  assert.match(python, /nonlocal i/);
  assert.match(python, /return \(a\[\(i - 1\)\], t\[a\[\(i - 1\)\]\]\)/);
});
