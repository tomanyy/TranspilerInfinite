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
      const convertsOneBasedIndex = expression.oneBasedIndex && usesZeroBasedArrays && expression.index.type !== "string";
      const key = convertsOneBasedIndex && expression.index.type === "number"
        ? String(Number(expression.index.value) - 1)
        : convertsOneBasedIndex
          ? `(${index} - 1)`
          : index;
      return `${object}[${key}]`;
    }
    case "table":
      return renderTable(expression, language, sourceLanguage);
    case "functionExpression": {
      const params = expression.params.join(", ");
      const body = renderStatements(expression.body, language, sourceLanguage, 1).join("\n");
      if (language === "lua") return `function(${params})\n${body}\nend`;
      if (language === "python") return `lambda ${params}: None`;
      if (language === "ruby") return `lambda do |${params}|\n${body}\nend`;
      return `function(${params}) {\n${body}\n}`;
    }
    case "call": {
      const config = languageConfig(language);
      const args = expression.args.map((arg) => renderExpression(arg, language, sourceLanguage));
      if (sourceLanguage === "r" && expression.name === "c") {
        if (language === "lua") return `{${args.join(", ")}}`;
        if (["js", "typescript", "python", "swift", "dart", "php"].includes(language)) return `[${args.join(", ")}]`;
        if (language === "java") return `new Object[] { ${args.join(", ")} }`;
        if (language === "csharp") return `new object[] { ${args.join(", ")} }`;
        if (language === "kotlin") return `listOf(${args.join(", ")})`;
        if (language === "go") return `[]any{${args.join(", ")}}`;
        if (language === "rust") return `vec![${args.join(", ")}]`;
        if (language === "scala") return `List(${args.join(", ")})`;
        if (language === "cpp") return `std::vector{${args.join(", ")}}`;
        if (language === "bash") return `(${args.join(" ")})`;
        if (language === "perl") return `[${args.join(", ")}]`;
      }
      if (expression.name === "pairs" && args.length === 1) {
        if (language === "js" || language === "typescript" || language === "dart") return `Object.keys(${args[0]})`;
        if (language === "python") return `${args[0]}.keys()`;
        if (language === "ruby") return `${args[0]}.keys`;
        if (language === "php") return `array_keys(${args[0]})`;
        if (language === "r") return `names(${args[0]})`;
      }
      if (expression.name === "table.insert" && args.length >= 2) {
        if (["js", "typescript", "dart"].includes(language)) return `${args[0]}.push(${args.slice(1).join(", ")})`;
        if (language === "python") return `${args[0]}.append(${args[1]})`;
        if (language === "ruby") return `${args[0]} << ${args[1]}`;
        if (language === "php") return `array_push(${args[0]}, ${args.slice(1).join(", ")})`;
      }
      if (expression.name === "table.sort" && args.length >= 1) {
        if (["js", "typescript", "dart"].includes(language)) return `${args[0]}.sort(${args.slice(1).join(", ")})`;
        if (language === "python") return `${args[0]}.sort()`;
        if (language === "ruby") return `${args[0]}.sort!`;
      }
      const printFunctions = [
        "console.log", "print", "puts", "println", "System.out.println",
        "Console.WriteLine", "fmt.Println", "println!", "std::cout",
      ];

      if (config.syntax === "bash" && printFunctions.includes(expression.name)) {
        return `${config.printName} ${args.join(" ")}`;
      }
      if (language === "cpp" && printFunctions.includes(expression.name)) {
        return `std::cout << ${args.join(" << \" \" << ")} << std::endl`;
      }
      if (language === "rust" && printFunctions.includes(expression.name)) {
        const format = args.map(() => "{}").join(" ");
        return `println!("${format}"${args.length ? `, ${args.join(", ")}` : ""})`;
      }

      const name = printFunctions.includes(expression.name) ? config.printName : expression.name;
      return `${name}(${args.join(", ")})`;
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

function collectStatementNames(statements, type) {
  const names = new Set();
  for (const statement of statements) {
    if (statement.type === type && statement.name) names.add(statement.name);
    if (statement.body) {
      for (const name of collectStatementNames(statement.body, type)) names.add(name);
    }
    for (const branch of [statement.then, statement.otherwise]) {
      if (Array.isArray(branch)) {
        for (const name of collectStatementNames(branch, type)) names.add(name);
      }
    }
  }
  return names;
}

function renderStatements(statements, language, sourceLanguage, depth = 0, declaredVariables = new Set()) {
  const config = languageConfig(language);
  const indentation = "    ".repeat(depth);
  const lines = [];

  for (const statement of statements) {
    if (statement.type === "function") {
      const params = statement.params.join(", ");
      let header;
      if (config.syntax === "lua") header = `function ${statement.name}(${params})`;
      else if (config.syntax === "python") header = `def ${statement.name}(${params}):`;
      else if (config.syntax === "ruby") header = `def ${statement.name}(${params})`;
      else if (config.syntax === "go") header = `func ${statement.name}(${params}) {`;
      else if (config.syntax === "bash") header = `${statement.name}() {`;
      else header = `function ${statement.name}(${params}) {`;
      lines.push(indentation + header, ...renderStatements(statement.body, language, sourceLanguage, depth + 1, declaredVariables));
      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "python") {}
      else if (config.syntax === "bash") lines.push(indentation + "}");
      else lines.push(indentation + "}");
      continue;
    }

    if (statement.type === "forIn") {
      const iterator = renderExpression(statement.iterator, language, sourceLanguage);
      const variable = `${config.variablePrefix}${statement.variable}`;
      let header;
      if (config.syntax === "lua") header = `for ${variable} in ${iterator} do`;
      else if (config.syntax === "python") header = `for ${variable} in ${iterator}:`;
      else if (config.syntax === "ruby") header = `for ${variable} in ${iterator} do`;
      else if (config.syntax === "bash") header = `for ${variable} in ${iterator}; do`;
      else header = `for (const ${variable} of ${iterator}) {`;
      lines.push(indentation + header, ...renderStatements(statement.body, language, sourceLanguage, depth + 1, declaredVariables));
      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "bash") lines.push(indentation + "done");
      else if (config.syntax !== "python") lines.push(indentation + "}");
      continue;
    }

    if (statement.type === "return") {
      const values = statement.values.map((value) => renderExpression(value, language, sourceLanguage));
      let result = values.join(", ");
      if (values.length > 1 && ["js", "typescript", "dart"].includes(language)) result = `[${result}]`;
      if (values.length > 1 && language === "python") result = `(${result})`;
      lines.push(`${indentation}return${result ? ` ${result}` : ""}${config.semicolon ? ";" : ""}`);
      continue;
    }

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

      lines.push(indentation + header, ...renderStatements(statement.then, language, sourceLanguage, depth + 1, declaredVariables));
      if (statement.otherwise.length) {
        const elseLine = config.syntax === "python"
          ? "else:"
          : ["lua", "ruby", "bash"].includes(config.syntax)
            ? "else"
            : "} else {";
        lines.push(indentation + elseLine, ...renderStatements(statement.otherwise, language, sourceLanguage, depth + 1, declaredVariables));
      }

      if (["lua", "ruby"].includes(config.syntax)) lines.push(indentation + "end");
      else if (config.syntax === "bash") lines.push(indentation + "fi");
      else if (config.syntax !== "python") lines.push(indentation + "}");
      continue;
    }

    const suffix = config.semicolon ? ";" : "";
    if (statement.type === "let") {
      if (config.syntax === "bash") {
        const value = renderExpression(statement.value, language, sourceLanguage);
        lines.push(`${indentation}${statement.name}=${value}`);
        continue;
      }
      const variable = `${config.variablePrefix}${statement.name.replace(/^\$/, "")}`;
      const declaration = config.declaration ? `${config.declaration} ` : "";
      if (statement.value.type === "functionExpression" && config.syntax === "python") {
        lines.push(`${indentation}def ${variable}(${statement.value.params.join(", ")}):`);
        const assigned = collectStatementNames(statement.value.body, "assign");
        const declared = collectStatementNames(statement.value.body, "let");
        const captured = [...assigned].filter((name) => !declared.has(name));
        if (captured.length) lines.push(`${indentation}    nonlocal ${captured.join(", ")}`);
        lines.push(...renderStatements(statement.value.body, language, sourceLanguage, depth + 1));
        continue;
      }
      const value = renderExpression(statement.value, language, sourceLanguage);
      lines.push(`${indentation}${declaration}${variable} ${config.declarationOperator} ${value}${suffix}`);
      declaredVariables.add(statement.name.replace(/^\$/, ""));
      continue;
    }

    if (statement.type === "assign") {
      const prefix = config.assignmentPrefix ?? config.variablePrefix;
      const variable = `${prefix}${statement.name.replace(/^\$/, "")}`;
      const operator = config.assignmentOperator ?? "=";
      const spacing = config.syntax === "bash" ? "" : " ";
      const value = renderExpression(statement.value, language, sourceLanguage);
      const normalizedName = statement.name.replace(/^\$/, "");
      if (["rust", "go", "cpp"].includes(language) && !declaredVariables.has(normalizedName)) {
        const declaration = language === "rust" ? "let mut " : language === "go" ? "" : "auto ";
        const bindingOperator = language === "go" ? ":=" : "=";
        lines.push(`${indentation}${declaration}${normalizedName} ${bindingOperator} ${value}${suffix}`);
        declaredVariables.add(normalizedName);
        continue;
      }
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
