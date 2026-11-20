const operators = ["===", "!==", "==", "!=", "<=", ">=", "&&", "||", "..", "(", ")", "{", "}", ",", ";", "=", "<", ">", "+", "-", "*", "/"];

export const LANGUAGES = [
  { id: "lua", label: "Lua", family: "lua" },
  { id: "js", label: "JavaScript", family: "curly" },
  { id: "typescript", label: "TypeScript", family: "typescript" },
  { id: "python", label: "Python", family: "python" },
  { id: "ruby", label: "Ruby", family: "ruby" },
  { id: "java", label: "Java", family: "curly" },
  { id: "csharp", label: "C#", family: "csharp" },
  { id: "kotlin", label: "Kotlin", family: "kotlin" },
  { id: "swift", label: "Swift", family: "swift" },
  { id: "go", label: "Go", family: "go" },
  { id: "php", label: "PHP", family: "php" },
  { id: "rust", label: "Rust", family: "rust" },
] as const;
type Language = typeof LANGUAGES[number]["id"];
type Token = { type: "string" | "number" | "name" | "op"; value: string };
type Expr =
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "bool"; value: boolean }
  | { type: "nil" }
  | { type: "name"; value: string }
  | { type: "unary"; op: string; value: Expr }
  | { type: "call"; name: string; args: Expr[] }
  | { type: "binary"; op: string; left: Expr; right: Expr };
type Statement =
  | { type: "while"; condition: Expr; body: Statement[] }
  | { type: "if"; condition: Expr; then: Statement[]; otherwise: Statement[] }
  | { type: "let" | "assign"; name: string; value: Expr }
  | { type: "expr"; value: Expr };

function tokenize(source: string, language: Language): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    const comment = language === "lua" ? "--" : ["python", "ruby"].includes(language) ? "#" : "//";
    if (source.startsWith(comment, i) || (language === "php" && c === "#")) {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "\"" || c === "'") {
      const quote = c;
      i++;
      let value = "";
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < source.length) {
          i++;
          value += ({ n: "\n", t: "\t" })[source[i]] ?? source[i];
          i++;
        } else value += source[i++];
      }
      if (i >= source.length) throw new Error("Unterminated string");
      i++;
      tokens.push({ type: "string", value });
      continue;
    }
    const number = source.slice(i).match(/^\d+(?:\.\d+)?/);
    if (number) { tokens.push({ type: "number", value: number[0] }); i += number[0].length; continue; }
    const name = source.slice(i).match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/);
    if (name) { tokens.push({ type: "name", value: name[0] }); i += name[0].length; continue; }
    const op = operators.find((item) => source.startsWith(item, i));
    if (op) { tokens.push({ type: "op", value: op }); i += op.length; continue; }
    throw new Error(`Unexpected character '${c}'`);
  }
  return tokens;
}

function pythonToBraces(source: string): string {
  const out = [];
  const blocks = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const indent = raw.match(/^[ \t]*/)[0].replace(/\t/g, "    ").length;
    const otherwise = line === "else:";
    const elif = line.startsWith("elif ") && line.endsWith(":");
    while (blocks.length && (blocks.at(-1).indent > indent || (blocks.at(-1).indent === indent && !otherwise && !elif))) {
      blocks.pop(); out.push("}");
    }
    if (otherwise || elif) {
      if (!blocks.length || blocks.at(-1).indent !== indent || !blocks.at(-1).isIf) {
        throw new Error(`Line ${index + 1}: '${line}' without matching if`);
      }
      out.push(otherwise ? "} else {" : `} else if (${line.slice(5, -1).trim()}) {`);
    } else if (line.startsWith("if ") && line.endsWith(":")) {
      out.push(`if (${line.slice(3, -1).trim()}) {`);
      blocks.push({ indent, isIf: true });
    } else if (line.startsWith("while ") && line.endsWith(":")) {
      out.push(`while (${line.slice(6, -1).trim()}) {`);
      blocks.push({ indent, isIf: false });
    } else out.push(line);
  }
  while (blocks.length) { blocks.pop(); out.push("}"); }
  return out.join("\n");
}

function rubyToBraces(source: string): string {
  const out = [];
  const blocks = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "end") {
      if (!blocks.length) throw new Error("Unexpected 'end'");
      blocks.pop(); out.push("}"); continue;
    }
    if (line === "else" || line.startsWith("elsif ")) {
      if (!blocks.length || !blocks.at(-1).isIf) throw new Error(`'${line}' without matching if`);
      out.push(line === "else" ? "} else {" : `} else if (${line.slice(6).replace(/\s+then$/, "").trim()}) {`);
      continue;
    }
    const conditional = line.match(/^(if|while)\s+(.+?)(?:\s+then|\s+do)?$/);
    if (conditional) {
      const isIf = conditional[1] === "if";
      out.push(`${isIf ? "if" : "while"} (${conditional[2].trim()}) {`);
      blocks.push({ isIf });
      continue;
    }
    const bareOutput = line.match(/^(puts|print)\s+(.+)$/);
    out.push(bareOutput ? `${bareOutput[1]}(${bareOutput[2]})` : line);
  }
  if (blocks.length) throw new Error("Missing 'end' for Ruby block");
  return out.join("\n");
}

function normalizeSwift(source: string): string {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const conditional = line.match(/^(if|while)\s+(.+?)\s*\{$/);
    if (conditional) return `${conditional[1]} (${conditional[2]}) {`;
    const elseIf = line.match(/^}\s*else if\s+(.+?)\s*\{$/);
    if (elseIf) return `} else if (${elseIf[1]}) {`;
    return raw;
  }).join("\n");
}

function normalizeGo(source: string): string {
  return source.split(/\r?\n/).map((raw) => {
    let line = raw.trim();
    const loop = line.match(/^for(?:\s+(.+?))?\s*\{$/);
    if (loop) return `while (${loop[1] || "true"}) {`;
    const conditional = line.match(/^if\s+(.+?)\s*\{$/);
    if (conditional) return `if (${conditional[1]}) {`;
    line = line.replace(/\bvar\s+([A-Za-z_]\w*)\s+[A-Za-z_]\w*\s*=/, "var $1 = ");
    line = line.replace(/\b([A-Za-z_]\w*)\s*:=\s*/, "var $1 = ");
    return line;
  }).join("\n");
}

function normalizeRust(source: string): string {
  return source
    .replace(/\bprintln!\s*\(/g, "println(")
    .replace(/\bprint!\s*\(/g, "print(")
    .split(/\r?\n/).map((raw) => {
      let line = raw.trim();
      line = line.replace(/^let\s+mut\s+/, "let ").replace(/^(let)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z0-9_<>]+\s*=/, "$1 $2 =");
      const conditional = line.match(/^(if|while)\s+(.+?)\s*\{$/);
      if (conditional) return `${conditional[1]} (${conditional[2]}) {`;
      return line;
    }).join("\n");
}

function normalizePhp(source: string): string {
  return source.replace(/<\?php|\?>/g, "").split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const echo = line.match(/^echo\s+(.+);?$/);
    return echo ? `print(${echo[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

function normalizeTypeScript(source: string): string {
  return source.replace(/\b(let|const|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(?:number|string|boolean|any)\s*=/g, "$1 $2 =");
}

function normalizeCSharp(source: string): string {
  return source.replace(/\b(?:int|double|float|long|bool|string|decimal|byte)\s+([A-Za-z_]\w*)\s*=/g, "var $1 =");
}

function normalizeKotlin(source: string): string {
  return source.replace(/\b(?:val|var)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z?<>]+\s*=/g, "val $1 =");
}

class Parser {
  tokens: Token[];
  i: number;
  language: Language;
  constructor(tokens: Token[], language: Language) { this.tokens = tokens; this.i = 0; this.language = language; }
  peek(): Token | undefined;
  peek(value: string): boolean;
  peek(value?: string): Token | boolean | undefined { const token = this.tokens[this.i]; return value === undefined ? token : token?.value === value; }
  take(): Token | undefined { return this.tokens[this.i++]; }
  accept(value: string): boolean { if (this.peek(value)) { this.i++; return true; } return false; }
  expect(value: string): void { if (!this.accept(value)) throw new Error(`Expected '${value}', found '${(this.tokens[this.i] as Token | undefined)?.value ?? "end of input"}'`); }
  name(): string { const token = this.take(); if (token?.type !== "name") throw new Error("Expected a variable name"); return token.value; }
  program(stops: string[] = []): Statement[] {
    const body: Statement[] = [];
    while (this.peek() && !stops.includes(this.peek().value)) body.push(this.statement());
    return body;
  }
  statement(): Statement {
    const lang = this.language;
    if (lang === "lua") {
      if (this.accept("while")) {
        const condition = this.expression(); this.expect("do");
        const body = this.program(["end"]); this.expect("end");
        return { type: "while", condition, body };
      }
      if (this.accept("if")) return this.luaIf();
      if (this.accept("local")) { const name = this.name(); this.expect("="); return { type: "let", name, value: this.expression() }; }
    } else {
      if (this.accept("while")) {
        this.expect("("); const condition = this.expression(); this.expect(")");
        return { type: "while", condition, body: this.braceBlock() };
      }
      if (this.accept("if")) return this.jsIf();
      if (["let", "const", "var", "val", "int", "double", "float", "long", "boolean", "String", "string", "bool", "char", "decimal", "byte"].some((type) => this.accept(type))) {
        const name = this.name(); this.expect("="); const value = this.expression(); this.accept(";");
        return { type: "let", name, value };
      }
    }
    if (this.peek()?.type === "name" && this.tokens[this.i + 1]?.value === "=") {
      const name = this.take().value; this.take(); const value = this.expression(); this.accept(";");
      return { type: "assign", name, value };
    }
    const value = this.expression(); this.accept(";");
    return { type: "expr", value };
  }
  braceBlock(): Statement[] { this.expect("{"); const body = this.program(["}"]); this.expect("}"); return body; }
  jsIf(): Statement {
    this.expect("("); const condition = this.expression(); this.expect(")");
    const then = this.braceBlock();
    let otherwise = [];
    if (this.accept("else")) otherwise = this.accept("if") ? [this.jsIf()] : this.braceBlock();
    return { type: "if", condition, then, otherwise };
  }
  luaIf(): Statement {
    const condition = this.expression(); this.expect("then");
    const then = this.program(["else", "elseif", "end"]);
    let otherwise = [];
    if (this.accept("elseif")) otherwise = [this.luaIf()];
    else if (this.accept("else")) { otherwise = this.program(["end"]); this.expect("end"); }
    else this.expect("end");
    return { type: "if", condition, then, otherwise };
  }
  expression(min: number = 0): Expr {
    let left = this.primary();
    const precedence = { or: 1, "||": 1, and: 2, "&&": 2, "==": 3, "===": 3, "~=": 3, "!=": 3, "!==": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "..": 4, "+": 5, "-": 5, "*": 6, "/": 6 };
    while (this.peek() && (precedence[this.peek().value] ?? -1) >= min) {
      const op = this.take().value;
      const right = this.expression(precedence[op] + 1);
      left = { type: "binary", op, left, right };
    }
    return left;
  }
  primary(): Expr {
    const token = this.take();
    if (!token) throw new Error("Expected an expression");
    if (token.type === "string") return { type: "string", value: token.value };
    if (token.type === "number") return { type: "number", value: token.value };
    if (token.value === "-") return { type: "unary", op: "-", value: this.primary() };
    if (token.value === "(") { const value = this.expression(); this.expect(")"); return value; }
    if (token.type === "name") {
      if (["true", "True"].includes(token.value)) return { type: "bool", value: true };
      if (["false", "False"].includes(token.value)) return { type: "bool", value: false };
      if (["nil", "null", "None"].includes(token.value)) return { type: "nil" };
      if (this.accept("(")) {
        const args = [];
        if (!this.peek(")")) { do { args.push(this.expression()); } while (this.accept(",")); }
        this.expect(")"); return { type: "call", name: token.value, args };
      }
      return { type: "name", value: token.value };
    }
    throw new Error(`Unexpected token '${token.value}'`);
  }
}

function renderExpr(expr: Expr, language: Language): string {
  switch (expr.type) {
    case "string": return JSON.stringify(expr.value);
    case "number": return expr.value;
    case "name": return language === "php" ? (expr.value.startsWith("$") ? expr.value : `$${expr.value}`) : expr.value.replace(/^\$/, "");
    case "bool": return language === "python" ? (expr.value ? "True" : "False") : String(expr.value);
    case "nil": return ({ lua: "nil", js: "null", typescript: "null", python: "None", ruby: "nil", java: "null", csharp: "null", kotlin: "null", swift: "nil", go: "nil", php: "null", rust: "None" })[language];
    case "unary": return `-${renderExpr(expr.value, language)}`;
    case "call": {
      const name = ["console.log", "print", "puts", "println", "System.out.println", "Console.WriteLine", "fmt.Println", "println!"].includes(expr.name)
        ? ({ lua: "print", js: "console.log", typescript: "console.log", python: "print", ruby: "puts", java: "System.out.println", csharp: "Console.WriteLine", kotlin: "println", swift: "print", go: "fmt.Println", php: "print", rust: "println!" })[language]
        : expr.name;
      return `${name}(${expr.args.map((arg) => renderExpr(arg, language)).join(", ")})`;
    }
    case "binary": {
      let op = expr.op;
      if (op === "and" || op === "&&") op = ["python", "lua", "ruby"].includes(language) ? "and" : "&&";
      if (op === "or" || op === "||") op = ["python", "lua", "ruby"].includes(language) ? "or" : "||";
      if ((op === "!=" || op === "!==" || op === "~=") && language === "lua") op = "~=";
      else if (op === "~=" || op === "!==") op = "!=";
      if (op === "===") op = "==";
      if (op === "..") op = language === "lua" ? ".." : "+";
      return `(${renderExpr(expr.left, language)} ${op} ${renderExpr(expr.right, language)})`;
    }
  }
}

function renderStatements(statements: Statement[], language: Language, depth = 0): string[] {
  const pad = "    ".repeat(depth);
  const lines = [];
  for (const statement of statements) {
    if (statement.type === "while") {
      const header = language === "python" ? `while ${renderExpr(statement.condition, language)}:` : language === "lua" ? `while ${renderExpr(statement.condition, language)} do` : language === "ruby" ? `while ${renderExpr(statement.condition, language)}` : language === "go" ? `for ${renderExpr(statement.condition, language)} {` : language === "swift" ? `while ${renderExpr(statement.condition, language)} {` : `while (${renderExpr(statement.condition, language)}) {`;
      lines.push(pad + header, ...renderStatements(statement.body, language, depth + 1));
      if (language === "lua" || language === "ruby") lines.push(pad + "end");
      if (["js", "typescript", "java", "csharp", "kotlin", "swift", "go", "php", "rust"].includes(language)) lines.push(pad + "}");
    } else if (statement.type === "if") {
      const header = language === "python" ? `if ${renderExpr(statement.condition, language)}:` : language === "lua" ? `if ${renderExpr(statement.condition, language)} then` : language === "ruby" ? `if ${renderExpr(statement.condition, language)}` : language === "swift" || language === "go" ? `if ${renderExpr(statement.condition, language)} {` : `if (${renderExpr(statement.condition, language)}) {`;
      lines.push(pad + header, ...renderStatements(statement.then, language, depth + 1));
      if (statement.otherwise.length) {
        lines.push(pad + (language === "python" ? "else:" : language === "lua" || language === "ruby" ? "else" : "} else {"));
        lines.push(...renderStatements(statement.otherwise, language, depth + 1));
      }
      if (language === "lua" || language === "ruby") lines.push(pad + "end");
      if (["js", "typescript", "java", "csharp", "kotlin", "swift", "go", "php", "rust"].includes(language)) lines.push(pad + "}");
    } else if (statement.type === "let") {
      const prefix = language === "lua" ? "local " : ["js", "typescript"].includes(language) ? "let " : language === "java" || language === "csharp" ? "var " : language === "kotlin" ? "val " : language === "rust" ? "let mut " : "";
      const name = language === "php" ? `$${statement.name.replace(/^\$/, "")}` : statement.name.replace(/^\$/, "");
      const value = renderExpr(statement.value, language);
      lines.push(`${pad}${prefix}${name}${language === "go" ? " :=" : " ="} ${value}${["js", "typescript", "java", "csharp", "php", "rust"].includes(language) ? ";" : ""}`);
    } else if (statement.type === "assign") {
      const name = language === "php" ? `$${statement.name.replace(/^\$/, "")}` : statement.name.replace(/^\$/, "");
      lines.push(`${pad}${name} = ${renderExpr(statement.value, language)}${["js", "typescript", "java", "csharp", "php", "rust"].includes(language) ? ";" : ""}`);
    } else {
      lines.push(`${pad}${renderExpr(statement.value, language)}${["js", "typescript", "java", "csharp", "php", "rust"].includes(language) ? ";" : ""}`);
    }
  }
  return lines;
}

export function translate(source: string, from: Language, to: Language): string {
  const family = LANGUAGES.find((language) => language.id === from)?.family;
  const normalized = family === "python" ? pythonToBraces(source)
    : family === "ruby" ? rubyToBraces(source)
    : family === "swift" ? normalizeSwift(source)
    : family === "go" ? normalizeGo(source)
    : family === "rust" ? normalizeRust(source)
    : family === "php" ? normalizePhp(source)
    : family === "typescript" ? normalizeTypeScript(source)
    : family === "csharp" ? normalizeCSharp(source)
    : family === "kotlin" ? normalizeKotlin(source)
    : source;
  const program = new Parser(tokenize(normalized, from), from).program();
  return renderStatements(program, to).join("\n");
}
