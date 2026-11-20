import { languageConfig } from "./languageRegistry.js";

function renderExpression(expression, language) {
  switch (expression.type) {
    case "string":
      return JSON.stringify(expression.value);
    case "number":
      return expression.value;
    case "name": {
      const { variablePrefix } = languageConfig(language);
      return `${variablePrefix}${expression.value.replace(/^\$/, "")}`;
    }
    case "bool":
      if (language === "python") return expression.value ? "True" : "False";
      if (language === "r") return expression.value ? "TRUE" : "FALSE";
      return String(expression.value);
    case "nil":
      return languageConfig(language).nilValue;
    case "unary":
      return `-${renderExpression(expression.value, language)}`;
    case "call": {
      const config = languageConfig(language);
      const printFunctions = [
        "console.log", "print", "puts", "println", "System.out.println",
        "Console.WriteLine", "fmt.Println", "println!", "std::cout",
      ];

      if (config.syntax === "bash" && printFunctions.includes(expression.name)) {
        return `${config.printName} ${expression.args.map((arg) => renderExpression(arg, language)).join(" ")}`;
      }
      if (language === "cpp" && printFunctions.includes(expression.name)) {
        const args = expression.args.map((arg) => renderExpression(arg, language));
        return `std::cout << ${args.join(" << \" \" << ")} << std::endl`;
      }

      const name = printFunctions.includes(expression.name) ? config.printName : expression.name;
      const args = expression.args.map((arg) => renderExpression(arg, language)).join(", ");
      return `${name}(${args})`;
    }
    case "binary": {
      const config = languageConfig(language);
      let operator = expression.op;
      if (operator === "and" || operator === "&&") operator = config.andOperator;
      if (operator === "or" || operator === "||") operator = config.orOperator;
      if (["!=", "!==", "~="].includes(operator)) operator = config.notEqual;
      if (operator === "===") operator = "==";
      if (operator === "..") operator = config.concat;
      return `(${renderExpression(expression.left, language)} ${operator} ${renderExpression(expression.right, language)})`;
    }
    default:
      throw new Error("Unsupported expression");
  }
}

function renderStatements(statements, language, depth = 0) {
  const config = languageConfig(language);
  const indentation = "    ".repeat(depth);
  const lines = [];

  for (const statement of statements) {
    if (statement.type === "while") {
      const condition = renderExpression(statement.condition, language);
      let header;
      if (config.syntax === "python") header = `while ${condition}:`;
      else if (config.syntax === "lua") header = `while ${condition} do`;
      else if (config.syntax === "ruby") header = `while ${condition}`;
      else if (config.syntax === "bash") header = `while ${condition}; do`;
      else if (config.syntax === "go") header = `for ${condition} {`;
      else if (config.syntax === "swift") header = `while ${condition} {`;
      else header = `while (${condition}) {`;

      lines.push(indentation + header, ...renderStatements(statement.body, language, depth + 1));
      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "bash") lines.push(indentation + "done");
      else if (config.syntax !== "python") lines.push(indentation + "}");
      continue;
    }

    if (statement.type === "if") {
      const condition = renderExpression(statement.condition, language);
      let header;
      if (config.syntax === "python") header = `if ${condition}:`;
      else if (config.syntax === "lua") header = `if ${condition} then`;
      else if (config.syntax === "ruby") header = `if ${condition}`;
      else if (config.syntax === "bash") header = `if ${condition}; then`;
      else if (["swift", "go"].includes(config.syntax)) header = `if ${condition} {`;
      else header = `if (${condition}) {`;

      lines.push(indentation + header, ...renderStatements(statement.then, language, depth + 1));
      if (statement.otherwise.length) {
        const elseLine = config.syntax === "python"
          ? "else:"
          : ["lua", "ruby", "bash"].includes(config.syntax)
            ? "else"
            : "} else {";
        lines.push(indentation + elseLine, ...renderStatements(statement.otherwise, language, depth + 1));
      }

      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "bash") lines.push(indentation + "fi");
      else if (config.syntax !== "python") lines.push(indentation + "}");
      continue;
    }

    const suffix = config.semicolon ? ";" : "";
    if (statement.type === "let") {
      const variable = `${config.variablePrefix}${statement.name.replace(/^\$/, "")}`;
      const declaration = config.declaration ? `${config.declaration} ` : "";
      lines.push(`${indentation}${declaration}${variable} ${config.declarationOperator} ${renderExpression(statement.value, language)}${suffix}`);
      continue;
    }

    if (statement.type === "assign") {
      const prefix = config.assignmentPrefix ?? config.variablePrefix;
      const variable = `${prefix}${statement.name.replace(/^\$/, "")}`;
      const operator = config.assignmentOperator ?? "=";
      const spacing = config.syntax === "bash" ? "" : " ";
      lines.push(`${indentation}${variable}${spacing}${operator}${spacing}${renderExpression(statement.value, language)}${suffix}`);
      continue;
    }

    lines.push(`${indentation}${renderExpression(statement.value, language)}${suffix}`);
  }

  return lines;
}

export { renderStatements };
