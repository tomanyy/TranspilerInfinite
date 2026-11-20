import { languageConfig } from "./languageRegistry.js";

function renderExpression(expression, language, sourceLanguage) {
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
      return `-${renderExpression(expression.value, language, sourceLanguage)}`;
    case "index": {
      const object = renderExpression(expression.object, language, sourceLanguage);
      const index = renderExpression(expression.index, language, sourceLanguage);
      const usesZeroBasedArrays = !["lua", "r"].includes(language);
      const key = expression.luaIndex && usesZeroBasedArrays && expression.index.type !== "string"
        ? `(${index} - 1)`
        : index;
      return `${object}[${key}]`;
    }
    case "table":
      return renderTable(expression, language, sourceLanguage);
    case "call": {
      const config = languageConfig(language);
      const printFunctions = [
        "console.log", "print", "puts", "println", "System.out.println",
        "Console.WriteLine", "fmt.Println", "println!", "std::cout",
      ];

      if (config.syntax === "bash" && printFunctions.includes(expression.name)) {
        const args = expression.args.map((arg) => renderExpression(arg, language, sourceLanguage));
        return `${config.printName} ${args.join(" ")}`;
      }
      if (language === "cpp" && printFunctions.includes(expression.name)) {
        const args = expression.args.map((arg) => renderExpression(arg, language, sourceLanguage));
        return `std::cout << ${args.join(" << \" \" << ")} << std::endl`;
      }

      const name = printFunctions.includes(expression.name) ? config.printName : expression.name;
      const args = expression.args.map((arg) => renderExpression(arg, language, sourceLanguage)).join(", ");
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
      const left = renderExpression(expression.left, language, sourceLanguage);
      const right = renderExpression(expression.right, language, sourceLanguage);
      return `(${left} ${operator} ${right})`;
    }
    default:
      throw new Error("Unsupported expression");
  }
}

function renderTable(table, language, sourceLanguage) {
  const style = languageConfig(language).tableStyle;
  const hasKeys = table.fields.some((field) => field.key !== null);
  const render = (expression) => renderExpression(expression, language, sourceLanguage);

  if (!hasKeys) {
    const values = table.fields.map((field) => render(field.value));
    if (style === "lua") return `{${values.join(", ")}}`;
    if (style === "java") return `new Object[] { ${values.join(", ")} }`;
    if (style === "csharp") return `new object[] { ${values.join(", ")} }`;
    if (style === "kotlin") return `listOf(${values.join(", ")})`;
    if (style === "go") return `[]any{${values.join(", ")}}`;
    if (style === "rust") return `vec![${values.join(", ")}]`;
    if (style === "scala") return `List(${values.join(", ")})`;
    if (style === "cpp") return `std::vector{${values.join(", ")}}`;
    if (style === "bash") return `(${values.join(" ")})`;
    if (style === "r") return `list(${values.join(", ")})`;
    return `[${values.join(", ")}]`;
  }

  const fields = table.fields.map((field, index) => ({
    key: field.key ?? { type: "number", value: String(index + 1) },
    value: field.value,
  }));
  const entries = fields.map(({ key, value }) => {
    const renderedKey = render(key);
    const renderedValue = render(value);
    const nameKey = key.type === "string" && /^[A-Za-z_$][\w$]*$/.test(key.value);
    if (style === "lua") return `[${renderedKey}] = ${renderedValue}`;
    if (style === "js") return `${nameKey ? key.value : `[${renderedKey}]`}: ${renderedValue}`;
    if (style === "python") return `${renderedKey}: ${renderedValue}`;
    if (style === "ruby") return `${renderedKey} => ${renderedValue}`;
    if (style === "java") return `java.util.Map.entry(${renderedKey}, ${renderedValue})`;
    if (style === "csharp") return `[${renderedKey}] = ${renderedValue}`;
    if (style === "kotlin") return `${renderedKey} to ${renderedValue}`;
    if (style === "swift") return `${renderedKey}: ${renderedValue}`;
    if (style === "go") return `${renderedKey}: ${renderedValue}`;
    if (style === "php" || style === "perl") return `${renderedKey} => ${renderedValue}`;
    if (style === "rust") return `(${renderedKey}, ${renderedValue})`;
    if (style === "scala") return `${renderedKey} -> ${renderedValue}`;
    if (style === "cpp") return `std::pair{${renderedKey}, ${renderedValue}}`;
    if (style === "bash") return `[${renderedKey}]=${renderedValue}`;
    if (style === "r") return `${nameKey ? key.value : renderedKey} = ${renderedValue}`;
    return `${renderedKey}: ${renderedValue}`;
  });

  if (style === "lua" || style === "js" || style === "python" || style === "swift" || style === "php") return `{${entries.join(", ")}}`;
  if (style === "ruby" || style === "perl" || style === "bash") return `{${entries.join(", ")}}`;
  if (style === "java") return `java.util.Map.ofEntries(${entries.join(", ")})`;
  if (style === "csharp") return `new System.Collections.Generic.Dictionary<object, object> { ${entries.join(", ")} }`;
  if (style === "kotlin") return `mapOf(${entries.join(", ")})`;
  if (style === "go") return `map[any]any{${entries.join(", ")}}`;
  if (style === "rust") return `std::collections::HashMap::from([${entries.join(", ")}])`;
  if (style === "scala") return `Map(${entries.join(", ")})`;
  if (style === "cpp") return `std::map{${entries.join(", ")}}`;
  if (style === "r") return `list(${entries.join(", ")})`;
  return `{${entries.join(", ")}}`;
}

function renderStatements(statements, language, sourceLanguage, depth = 0) {
  const config = languageConfig(language);
  const indentation = "    ".repeat(depth);
  const lines = [];

  for (const statement of statements) {
    if (statement.type === "while") {
      const condition = renderExpression(statement.condition, language, sourceLanguage);
      let header;
      if (config.syntax === "python") header = `while ${condition}:`;
      else if (config.syntax === "lua") header = `while ${condition} do`;
      else if (config.syntax === "ruby") header = `while ${condition}`;
      else if (config.syntax === "bash") header = `while ${condition}; do`;
      else if (config.syntax === "go") header = `for ${condition} {`;
      else if (config.syntax === "swift") header = `while ${condition} {`;
      else header = `while (${condition}) {`;

      lines.push(indentation + header, ...renderStatements(statement.body, language, sourceLanguage, depth + 1));
      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "bash") lines.push(indentation + "done");
      else if (config.syntax !== "python") lines.push(indentation + "}");
      continue;
    }

    if (statement.type === "if") {
      const condition = renderExpression(statement.condition, language, sourceLanguage);
      let header;
      if (config.syntax === "python") header = `if ${condition}:`;
      else if (config.syntax === "lua") header = `if ${condition} then`;
      else if (config.syntax === "ruby") header = `if ${condition}`;
      else if (config.syntax === "bash") header = `if ${condition}; then`;
      else if (["swift", "go"].includes(config.syntax)) header = `if ${condition} {`;
      else header = `if (${condition}) {`;

      lines.push(indentation + header, ...renderStatements(statement.then, language, sourceLanguage, depth + 1));
      if (statement.otherwise.length) {
        const elseLine = config.syntax === "python"
          ? "else:"
          : ["lua", "ruby", "bash"].includes(config.syntax)
            ? "else"
            : "} else {";
        lines.push(indentation + elseLine, ...renderStatements(statement.otherwise, language, sourceLanguage, depth + 1));
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
      const value = renderExpression(statement.value, language, sourceLanguage);
      lines.push(`${indentation}${declaration}${variable} ${config.declarationOperator} ${value}${suffix}`);
      continue;
    }

    if (statement.type === "assign") {
      const prefix = config.assignmentPrefix ?? config.variablePrefix;
      const variable = `${prefix}${statement.name.replace(/^\$/, "")}`;
      const operator = config.assignmentOperator ?? "=";
      const spacing = config.syntax === "bash" ? "" : " ";
      const value = renderExpression(statement.value, language, sourceLanguage);
      lines.push(`${indentation}${variable}${spacing}${operator}${spacing}${value}${suffix}`);
      continue;
    }

    if (statement.type === "set") {
      const target = renderExpression(statement.target, language, sourceLanguage);
      const value = renderExpression(statement.value, language, sourceLanguage);
      lines.push(`${indentation}${target} = ${value}${suffix}`);
      continue;
    }

    lines.push(`${indentation}${renderExpression(statement.value, language, sourceLanguage)}${suffix}`);
  }

  return lines;
}

export { renderStatements };
