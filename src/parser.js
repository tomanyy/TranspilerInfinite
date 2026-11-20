export class Parser {
  constructor(tokens, language) {
    this.tokens = tokens;
    this.index = 0;
    this.language = language;
  }

  peek() {
    return this.tokens[this.index];
  }

  is(value) {
    return this.peek()?.value === value;
  }

  take() {
    return this.tokens[this.index++];
  }

  accept(value) {
    if (!this.is(value)) return false;
    this.index += 1;
    return true;
  }

  expect(value) {
    if (!this.accept(value)) {
      throw new Error(`Expected '${value}', found '${this.peek()?.value ?? "end of input"}'`);
    }
  }

  name() {
    const token = this.take();
    if (token?.type !== "name") throw new Error("Expected a variable name");
    return token.value;
  }

  program(stops = []) {
    const body = [];
    while (this.peek() && !stops.includes(this.peek().value)) {
      body.push(this.statement());
    }
    return body;
  }

  statement() {
    if (this.language === "lua") return this.luaStatement();
    return this.braceStatement();
  }

  luaStatement() {
    if (this.accept("while")) {
      const condition = this.expression();
      this.expect("do");
      const body = this.program(["end"]);
      this.expect("end");
      return { type: "while", condition, body };
    }
    if (this.accept("if")) return this.luaIf();
    if (this.accept("local")) {
      const name = this.name();
      this.expect("=");
      return { type: "let", name, value: this.expression() };
    }
    return this.simpleStatement();
  }

  braceStatement() {
    if (this.accept("while")) {
      this.expect("(");
      const condition = this.expression();
      this.expect(")");
      return { type: "while", condition, body: this.braceBlock() };
    }
    if (this.accept("if")) return this.jsIf();

    const declarationTypes = [
      "let", "const", "var", "val", "final", "auto", "my", "int", "double",
      "float", "long", "boolean", "String", "string", "bool", "char", "decimal", "byte",
    ];
    if (declarationTypes.some((type) => this.accept(type))) {
      const name = this.name();
      this.expect("=");
      const value = this.expression();
      this.accept(";");
      return { type: "let", name, value };
    }

    return this.simpleStatement();
  }

  simpleStatement() {
    if (this.peek()?.type === "name" && this.tokens[this.index + 1]?.value === "=") {
      const name = this.take().value;
      this.take();
      const value = this.expression();
      this.accept(";");
      return { type: "assign", name, value };
    }
    const value = this.expression();
    this.accept(";");
    return { type: "expr", value };
  }

  braceBlock() {
    this.expect("{");
    const body = this.program(["}"]);
    this.expect("}");
    return body;
  }

  jsIf() {
    this.expect("(");
    const condition = this.expression();
    this.expect(")");
    const then = this.braceBlock();
    let otherwise = [];
    if (this.accept("else")) {
      otherwise = this.accept("if") ? [this.jsIf()] : this.braceBlock();
    }
    return { type: "if", condition, then, otherwise };
  }

  luaIf() {
    const condition = this.expression();
    this.expect("then");
    const then = this.program(["else", "elseif", "end"]);
    let otherwise = [];
    if (this.accept("elseif")) otherwise = [this.luaIf()];
    else if (this.accept("else")) {
      otherwise = this.program(["end"]);
      this.expect("end");
    } else this.expect("end");
    return { type: "if", condition, then, otherwise };
  }

  expression(minimum = 0) {
    let left = this.primary();
    const precedence = {
      or: 1, "||": 1, and: 2, "&&": 2, "==": 3, "===": 3, "~=": 3,
      "!=": 3, "!==": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "..": 4,
      "+": 5, "-": 5, "*": 6, "/": 6,
    };

    while (this.peek() && (precedence[this.peek().value] ?? -1) >= minimum) {
      const operator = this.take().value;
      const right = this.expression(precedence[operator] + 1);
      left = { type: "binary", op: operator, left, right };
    }
    return left;
  }

  primary() {
    const token = this.take();
    if (!token) throw new Error("Expected an expression");
    if (token.type === "string") return { type: "string", value: token.value };
    if (token.type === "number") return { type: "number", value: token.value };
    if (token.value === "-") return { type: "unary", op: "-", value: this.primary() };
    if (token.value === "(") {
      const value = this.expression();
      this.expect(")");
      return value;
    }

    if (token.type === "name") {
      if (["true", "True", "TRUE"].includes(token.value)) return { type: "bool", value: true };
      if (["false", "False", "FALSE"].includes(token.value)) return { type: "bool", value: false };
      if (["nil", "null", "None", "NULL", "NA"].includes(token.value)) return { type: "nil" };
      if (this.accept("(")) {
        const args = [];
        if (!this.is(")")) {
          do args.push(this.expression()); while (this.accept(","));
        }
        this.expect(")");
        return { type: "call", name: token.value, args };
      }
      return { type: "name", value: token.value };
    }

    throw new Error(`Unexpected token '${token.value}'`);
  }
}
