const operators = ["===", "!==", "==", "!=", "<=", ">=", "&&", "||", "..", "(", ")", "{", "}", ",", ";", "=", "<", ">", "+", "-", "*", "/"];

export const LANGUAGES = [
  { id: "lua", label: "Lua", family: "lua", syntax: "lua", printName: "print", nilValue: "nil", declaration: "local", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "and", orOperator: "or", notEqual: "~=", concat: ".." },
  { id: "js", label: "JavaScript", family: "curly", syntax: "curly", printName: "console.log", nilValue: "null", declaration: "let", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "typescript", label: "TypeScript", family: "typescript", syntax: "curly", printName: "console.log", nilValue: "null", declaration: "let", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "python", label: "Python", family: "python", syntax: "python", printName: "print", nilValue: "None", declaration: "", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "and", orOperator: "or", notEqual: "!=", concat: "+" },
  { id: "ruby", label: "Ruby", family: "ruby", syntax: "ruby", printName: "puts", nilValue: "nil", declaration: "", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "and", orOperator: "or", notEqual: "!=", concat: "+" },
  { id: "java", label: "Java", family: "curly", syntax: "curly", printName: "System.out.println", nilValue: "null", declaration: "var", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "csharp", label: "C#", family: "csharp", syntax: "curly", printName: "Console.WriteLine", nilValue: "null", declaration: "var", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "kotlin", label: "Kotlin", family: "kotlin", syntax: "curly", printName: "println", nilValue: "null", declaration: "val", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "swift", label: "Swift", family: "swift", syntax: "swift", printName: "print", nilValue: "nil", declaration: "let", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "go", label: "Go", family: "go", syntax: "go", printName: "fmt.Println", nilValue: "nil", declaration: "", declarationOperator: ":=", semicolon: false, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "php", label: "PHP", family: "php", syntax: "php", printName: "print", nilValue: "null", declaration: "", declarationOperator: "=", semicolon: true, variablePrefix: "$", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "." },
  { id: "rust", label: "Rust", family: "rust", syntax: "rust", printName: "println!", nilValue: "None", declaration: "let mut", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "dart", label: "Dart", family: "curly", syntax: "curly", printName: "print", nilValue: "null", declaration: "var", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "scala", label: "Scala", family: "scala", syntax: "curly", printName: "println", nilValue: "null", declaration: "val", declarationOperator: "=", semicolon: false, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
  { id: "cpp", label: "C++", family: "cpp", syntax: "cpp", printName: "std::cout", nilValue: "nullptr", declaration: "auto", declarationOperator: "=", semicolon: true, variablePrefix: "", andOperator: "&&", orOperator: "||", notEqual: "!=", concat: "+" },
]         ;
                                               
                                               
function languageConfig(language          )                 {
  const config = LANGUAGES.find((entry) => entry.id === language);
  if (!config) throw new Error(`Unsupported language '${language}'`);
  return config;
}
                                                                          
           
                                     
                                     
                                    
                   
                                   
                                              
                                                
                                                            
                
                                                         
                                                                              
                                                         
                                  

function tokenize(source        , language          )          {
  const tokens          = [];
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

function pythonToBraces(source        )         {
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

function rubyToBraces(source        )         {
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

function normalizeSwift(source        )         {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const conditional = line.match(/^(if|while)\s+(.+?)\s*\{$/);
    if (conditional) return `${conditional[1]} (${conditional[2]}) {`;
    const elseIf = line.match(/^}\s*else if\s+(.+?)\s*\{$/);
    if (elseIf) return `} else if (${elseIf[1]}) {`;
    return raw;
  }).join("\n");
}

function normalizeGo(source        )         {
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

function normalizeRust(source        )         {
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

function normalizePhp(source        )         {
  return source.replace(/<\?php|\?>/g, "").split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const echo = line.match(/^echo\s+(.+);?$/);
    return echo ? `print(${echo[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

function normalizeTypeScript(source        )         {
  return source.replace(/\b(let|const|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(?:number|string|boolean|any)\s*=/g, "$1 $2 =");
}

function normalizeCSharp(source        )         {
  return source.replace(/\b(?:int|double|float|long|bool|string|decimal|byte)\s+([A-Za-z_]\w*)\s*=/g, "var $1 =");
}

function normalizeKotlin(source        )         {
  return source.replace(/\b(?:val|var)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z?<>]+\s*=/g, "val $1 =");
}

function normalizeCpp(source        )         {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (/^#include\b/.test(line) || line === "using namespace std;") return "";
      const output = line.match(/^(?:std::)?cout\s*<<\s*(.+?)(?:\s*<<\s*(?:std::)?endl)?;?$/);
    return output ? `print(${output[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

class Parser {
  tokens         ;
  i        ;
  language          ;
  constructor(tokens         , language          ) { this.tokens = tokens; this.i = 0; this.language = language; }
                            
                               
  peek(value         )                              { const token = this.tokens[this.i]; return value === undefined ? token : token?.value === value; }
  take()                    { return this.tokens[this.i++]; }
  accept(value        )          { if (this.peek(value)) { this.i++; return true; } return false; }
  expect(value        )       { if (!this.accept(value)) throw new Error(`Expected '${value}', found '${(this.tokens[this.i]                     )?.value ?? "end of input"}'`); }
  name()         { const token = this.take(); if (token?.type !== "name") throw new Error("Expected a variable name"); return token.value; }
  program(stops           = [])              {
    const body              = [];
    while (this.peek() && !stops.includes(this.peek().value)) body.push(this.statement());
    return body;
  }
  statement()            {
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
      if (["let", "const", "var", "val", "final", "auto", "int", "double", "float", "long", "boolean", "String", "string", "bool", "char", "decimal", "byte"].some((type) => this.accept(type))) {
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
  braceBlock()              { this.expect("{"); const body = this.program(["}"]); this.expect("}"); return body; }
  jsIf()            {
    this.expect("("); const condition = this.expression(); this.expect(")");
    const then = this.braceBlock();
    let otherwise = [];
    if (this.accept("else")) otherwise = this.accept("if") ? [this.jsIf()] : this.braceBlock();
    return { type: "if", condition, then, otherwise };
  }
  luaIf()            {
    const condition = this.expression(); this.expect("then");
    const then = this.program(["else", "elseif", "end"]);
    let otherwise = [];
    if (this.accept("elseif")) otherwise = [this.luaIf()];
    else if (this.accept("else")) { otherwise = this.program(["end"]); this.expect("end"); }
    else this.expect("end");
    return { type: "if", condition, then, otherwise };
  }
  expression(min         = 0)       {
    let left = this.primary();
    const precedence = { or: 1, "||": 1, and: 2, "&&": 2, "==": 3, "===": 3, "~=": 3, "!=": 3, "!==": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "..": 4, "+": 5, "-": 5, "*": 6, "/": 6 };
    while (this.peek() && (precedence[this.peek().value] ?? -1) >= min) {
      const op = this.take().value;
      const right = this.expression(precedence[op] + 1);
      left = { type: "binary", op, left, right };
    }
    return left;
  }
  primary()       {
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

function renderExpr(expr      , language          )         {
  switch (expr.type) {
    case "string": return JSON.stringify(expr.value);
    case "number": return expr.value;
    case "name": {
      const { variablePrefix } = languageConfig(language);
      return `${variablePrefix}${expr.value.replace(/^\$/, "")}`;
    }
    case "bool": return language === "python" ? (expr.value ? "True" : "False") : String(expr.value);
    case "nil": return languageConfig(language).nilValue;
    case "unary": return `-${renderExpr(expr.value, language)}`;
    case "call": {
      const config = languageConfig(language);
      const printNames = ["console.log", "print", "puts", "println", "System.out.println", "Console.WriteLine", "fmt.Println", "println!", "std::cout"];
      if (language === "cpp" && printNames.includes(expr.name)) {
        return `std::cout << ${expr.args.map((arg) => renderExpr(arg, language)).join(" << \" \" << ")} << std::endl`;
      }
      const name = printNames.includes(expr.name) ? config.printName : expr.name;
      return `${name}(${expr.args.map((arg) => renderExpr(arg, language)).join(", ")})`;
    }
    case "binary": {
      let op = expr.op;
      const config = languageConfig(language);
      if (op === "and" || op === "&&") op = config.andOperator;
      if (op === "or" || op === "||") op = config.orOperator;
      if (op === "!=" || op === "!==" || op === "~=") op = config.notEqual;
      if (op === "===") op = "==";
      if (op === "..") op = config.concat;
      return `(${renderExpr(expr.left, language)} ${op} ${renderExpr(expr.right, language)})`;
    }
  }
}

function renderStatements(statements             , language          , depth = 0)           {
  const config = languageConfig(language);
  const pad = "    ".repeat(depth);
  const lines = [];
  for (const statement of statements) {
    if (statement.type === "while") {
      const condition = renderExpr(statement.condition, language);
      const header = config.syntax === "python" ? `while ${condition}:` : config.syntax === "lua" ? `while ${condition} do` : config.syntax === "ruby" ? `while ${condition}` : config.syntax === "go" ? `for ${condition} {` : config.syntax === "swift" ? `while ${condition} {` : `while (${condition}) {`;
      lines.push(pad + header, ...renderStatements(statement.body, language, depth + 1));
      if (["lua", "ruby"].includes(config.syntax)) lines.push(pad + "end");
      else if (config.syntax !== "python") lines.push(pad + "}");
    } else if (statement.type === "if") {
      const condition = renderExpr(statement.condition, language);
      const header = config.syntax === "python" ? `if ${condition}:` : config.syntax === "lua" ? `if ${condition} then` : config.syntax === "ruby" ? `if ${condition}` : ["swift", "go"].includes(config.syntax) ? `if ${condition} {` : `if (${condition}) {`;
      lines.push(pad + header, ...renderStatements(statement.then, language, depth + 1));
      if (statement.otherwise.length) {
        lines.push(pad + (config.syntax === "python" ? "else:" : ["lua", "ruby"].includes(config.syntax) ? "else" : "} else {"));
        lines.push(...renderStatements(statement.otherwise, language, depth + 1));
      }
      if (["lua", "ruby"].includes(config.syntax)) lines.push(pad + "end");
      else if (config.syntax !== "python") lines.push(pad + "}");
    } else if (statement.type === "let") {
      const name = `${config.variablePrefix}${statement.name.replace(/^\$/, "")}`;
      const suffix = config.semicolon ? ";" : "";
      lines.push(`${pad}${config.declaration ? `${config.declaration} ` : ""}${name} ${config.declarationOperator} ${renderExpr(statement.value, language)}${suffix}`);
    } else if (statement.type === "assign") {
      const name = `${config.variablePrefix}${statement.name.replace(/^\$/, "")}`;
      lines.push(`${pad}${name} = ${renderExpr(statement.value, language)}${config.semicolon ? ";" : ""}`);
    } else {
      lines.push(`${pad}${renderExpr(statement.value, language)}${config.semicolon ? ";" : ""}`);
    }
  }
  return lines;
}

export function translate(source        , from          , to          )         {
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
    : family === "cpp" ? normalizeCpp(source)
    : source;
  const program = new Parser(tokenize(normalized, from), from).program();
  return renderStatements(program, to).join("\n");
}
