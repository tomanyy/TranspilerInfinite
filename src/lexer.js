const operators = [
  "===", "!==", "==", "!=", "<=", ">=", "&&", "||", "..",
  "(", ")", "{", "}", ",", ";", "=", "<", ">", "+", "-", "*", "/",
];

export function tokenize(source, language) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    const comment = language === "lua"
      ? "--"
      : ["python", "ruby", "bash", "perl", "r"].includes(language)
        ? "#"
        : "//";
    if (source.startsWith(comment, index) || (language === "php" && character === "#")) {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }

    if (character === "\"" || character === "'") {
      const quote = character;
      index += 1;
      let value = "";
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\" && index + 1 < source.length) {
          index += 1;
          value += ({ n: "\n", t: "\t" })[source[index]] ?? source[index];
          index += 1;
        } else {
          value += source[index];
          index += 1;
        }
      }
      if (index >= source.length) throw new Error("Unterminated string");
      index += 1;
      tokens.push({ type: "string", value });
      continue;
    }

    const number = source.slice(index).match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: number[0] });
      index += number[0].length;
      continue;
    }

    const name = source.slice(index).match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/);
    if (name) {
      tokens.push({ type: "name", value: name[0] });
      index += name[0].length;
      continue;
    }

    const operator = operators.find((item) => source.startsWith(item, index));
    if (operator) {
      tokens.push({ type: "op", value: operator });
      index += operator.length;
      continue;
    }

    throw new Error(`Unexpected character '${character}'`);
  }

  return tokens;
}
