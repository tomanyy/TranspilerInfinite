export function pythonToBraces(source) {
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

export function rubyToBraces(source) {
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

export function normalizeSwift(source) {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const conditional = line.match(/^(if|while)\s+(.+?)\s*\{$/);
    if (conditional) return `${conditional[1]} (${conditional[2]}) {`;
    const elseIf = line.match(/^}\s*else if\s+(.+?)\s*\{$/);
    if (elseIf) return `} else if (${elseIf[1]}) {`;
    return raw;
  }).join("\n");
}

export function normalizeGo(source) {
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

export function normalizeRust(source) {
  return source
    .replace(/\b(println|print)!\s*\(\s*"\{\}"\s*,\s*/g, "$1(")
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

export function normalizePhp(source) {
  return source.replace(/<\?php|\?>/g, "").split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const echo = line.match(/^echo\s+(.+);?$/);
    return echo ? `print(${echo[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

export function normalizeTypeScript(source) {
  return source.replace(/\b(let|const|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(?:number|string|boolean|any)\s*=/g, "$1 $2 =");
}

export function normalizeCSharp(source) {
  return source.replace(/\b(?:int|double|float|long|bool|string|decimal|byte)\s+([A-Za-z_]\w*)\s*=/g, "var $1 =");
}

export function normalizeKotlin(source) {
  return source.replace(/\b(?:val|var)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z?<>]+\s*=/g, "val $1 =");
}

export function normalizeCpp(source) {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (/^#include\b/.test(line) || line === "using namespace std;") return "";
      const output = line.match(/^(?:std::)?cout\s*<<\s*(.+?)(?:\s*<<\s*(?:std::)?endl)?;?$/);
    return output ? `print(${output[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

export function normalizeBash(source) {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return "";
    if (line === "done" || line === "fi") return "}";
    if (line === "else") return "} else {";
    const alternate = line.match(/^elif\s+(.+?);?\s*then$/);
    if (alternate) return `} else if (${alternate[1]}) {`;
    const loop = line.match(/^while\s+(.+?);?\s*do$/);
    if (loop) return `while (${loop[1]}) {`;
    const conditional = line.match(/^if\s+(.+?);?\s*then$/);
    if (conditional) return `if (${conditional[1]}) {`;
    const output = line.match(/^echo\s+(.+)$/);
    return output ? `print(${output[1]})` : raw;
  }).join("\n");
}

export function normalizePerl(source) {
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const output = line.match(/^(?:print|say)\s+(.+?);?$/);
    return output ? `print(${output[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

export function normalizeR(source) {
  return source.replace(/<-/g, "=");
}
