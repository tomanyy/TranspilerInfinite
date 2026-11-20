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
    } else if (line.startsWith("def ") && line.endsWith(":")) {
      const definition = line.match(/^def\s+([A-Za-z_]\w*)\s*\((.*?)\):$/);
      if (!definition) throw new Error(`Line ${index + 1}: invalid function definition`);
      out.push(`function ${definition[1]}(${definition[2]}) {`);
      blocks.push({ indent, isIf: false });
    } else if (line.startsWith("for ") && line.endsWith(":")) {
      const loop = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/);
      if (!loop) throw new Error(`Line ${index + 1}: invalid for loop`);
      out.push(`for (${loop[1]} in ${loop[2]}) {`);
      blocks.push({ indent, isIf: false });
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
    const definition = line.match(/^def\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (definition) {
      out.push(`function ${definition[1]}(${definition[2]}) {`);
      blocks.push({ isIf: false });
      continue;
    }
    const eachLoop = line.match(/^([A-Za-z_]\w*)\.each\s+do\s+\|([A-Za-z_]\w*)\|$/);
    if (eachLoop) {
      out.push(`for (${eachLoop[2]} in ${eachLoop[1]}) {`);
      blocks.push({ isIf: false });
      continue;
    }
    const forLoop = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+)$/);
    if (forLoop) {
      out.push(`for (${forLoop[1]} in ${forLoop[2]}) {`);
      blocks.push({ isIf: false });
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
    const range = line.match(/^for\s+_,\s*(\w+)\s*:=\s*range\s+(\w+)\s*\{(.*)\}$/);
    if (range) return `for (${range[1]} in ${range[2]}) {${range[3]}}`;
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
    .replace(/(fn\s+[A-Za-z_]\w*\s*\([^)]*\)\s*->\s*[A-Za-z_]\w*\s*\{)\s*([^{};]+?)\s*\}/g, "$1 return $2; }")
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
    let line = raw.trim();
    if (/^#include\b/.test(line) || line === "using namespace std;") return "";
    line = line.replace(/(?:std::)?cout\s*<<\s*(.+?)\s*<<\s*(?:std::)?endl\s*;?/g, "print($1);");
    return line;
  }).join("\n");
}

export function normalizeBash(source) {
  source = source.replace(/echo\s+\$\(\((?![^)]*\$\d)([^()]+)\)\)/g, "print(($1))");
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
  source = source.replace(/\b(if|while)\s*\(([^)]*)\)/g, (_, keyword, condition) =>
    `${keyword} (${condition.replace(/\b1\b/g, "true").replace(/\b0\b/g, "false")})`);
  source = source.replace(/\b(?:print|say)\s+([^();{}]+?)(;|(?=[{}]))/g, "print($1)$2");
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const output = line.match(/^(?:print|say)\s+(.+?);?$/);
    return output ? `print(${output[1].replace(/;$/, "")});` : raw;
  }).join("\n");
}

export function normalizeR(source) {
  return source.replace(/<-/g, "=");
}

export function normalizeCollections(source, language) {
  if (["java", "csharp"].includes(language)) {
    source = source.replace(/new\s+(?:int|long|double|float|Object|object|string|String)\s*\[\s*\]\s*\{([^}]*)\}/g, "[$1]");
    source = source.replace(/new\s*\[\s*\]\s*\{([^}]*)\}/g, "[$1]");
  }
  if (language === "typescript") {
    source = source.replace(/\b([A-Za-z_$][\w$]*)\s*:\s*(?:number|string|boolean|any)\s*\[\]\s*=/g, "$1 =");
  }
  if (language === "go") {
    source = source.replace(/\[\]\s*(?:int|int64|float64|string|bool|any|interface\{\})\s*\{([^}]*)\}/g, "[$1]");
  }
  if (language === "cpp") {
    source = source.replace(/std::vector\s*\{([^}]*)\}/g, "[$1]");
    source = source.replace(/std::map\s*\{\s*std::pair\s*\{\s*([^,{}]+),\s*([^{}]+)\}\s*\}/g, "{ $1: $2 }");
    source = source.replace(/std::map\s*\{\s*\{\s*([^,{}]+),\s*([^{}]+)\}\s*\}/g, "{ $1: $2 }");
  }
  if (language === "rust") {
    source = source.replace(/vec!\s*\[([^\]]*)\]/g, "[$1]");
    source = source.replace(/HashMap::from\s*\(\s*\[\s*\(\s*("[^"]+"),\s*("[^"]+"|\d+)\s*\)\s*\]\s*\)/g, "{ $1: $2 }");
  }
  if (language === "swift") {
    source = source.replace(/\[\s*("[^"]+"\s*:\s*[^\]]+)\]/g, "{ $1 }");
  }
  if (language === "ruby") source = source.replace(/\s+=>\s+/g, ": ");
  if (language === "php") {
    source = source.replace(/\[\s*("[^"]+"\s*=>\s*[^\]]+)\]/g, "{ $1 }");
    source = source.replace(/\s+=>\s+/g, ": ");
  }
  if (language === "scala") {
    source = source.replace(/Map\(\s*("[^"]+"\s*)->\s*([^()]+?)\s*\)/g, "{ $1: $2 }");
    source = source.replace(/\b(?!print\b|println\b)(\w+)\((\d+)\)/g, "$1[$2]");
  }
  if (language === "kotlin") source = source.replace(/mapOf\(\s*("[^"]+"\s*)to\s*([^()]+?)\s*\)/g, "{ $1: $2 }");
  if (language === "go") {
    source = source.replace(/map\s*\[\s*string\s*\]\s*string\s*\{\s*("[^"]+"\s*):\s*([^{}]+)\}/g, "{ $1: $2 }");
  }
  if (language === "csharp") {
    source = source.replace(/new\s+Dictionary<[^>]+>\s*\{([^}]*)\}/g, "{ $1 }");
  }
  if (language === "bash") {
    source = source.replace(/declare\s+-A\s+(\w+)=\(\[(\w+)\]=([^)]*)\)/g, "$1 = { $2: \"$3\" }");
    source = source.replace(/^(\w+)=\(([^)]*)\)$/gm, (_, name, values) => `${name} = [${values.trim().split(/\s+/).join(", ")}]`);
  }
  if (language === "perl") {
    source = source.replace(/\bmy\s+@(\w+)\s*=\s*\(([^)]*)\)/g, "my $1 = [$2]");
    source = source.replace(/\bmy\s+%(\w+)\s*=\s*\(([^)]*)\)/g, "my $1 = { $2 }");
    source = source.replace(/\b(\w+)\s*=>\s*("[^"]*"|\d+)/g, "$1: $2");
  }
  if (language === "r") {
    source = source.replace(/list\(\s*(\w+)\s*=\s*("[^"]*"|\d+)\s*\)/g, "{ $1: $2 }");
  }
  return source;
}

function untypedParameters(parameters) {
  return parameters.split(",").map((parameter) => parameter
    .trim()
    .replace(/^\$|^&/, "")
    .replace(/:\s*[A-Za-z_][\w<>?\[\]]*$/, "")
    .replace(/^(?:mut\s+)?[A-Za-z_][\w<>?\[\]]*\s+([A-Za-z_$][\w$]*)$/, "$1")
    .replace(/^([A-Za-z_$][\w$]*)\s+[A-Za-z_][\w<>?\[\]]*$/, "$1"))
    .join(", ");
}

export function normalizeFunctionsAndLoops(source, language) {
  if (language === "js" || language === "typescript") {
    source = source.replace(/for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+([^)]*)\)/g, "for ($1 in $2)");
    source = source.replace(/:\s*(?:number|string|boolean|any)\b/g, "");
  }
  if (["java", "csharp", "cpp", "dart"].includes(language)) {
    source = source.replace(/(?:public|private|static|final|virtual|override|async|\s)*\s*(?:int|long|double|float|bool|boolean|string|String|void|auto|var|[A-Z]\w*)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g,
      (_, name, params) => `function ${name[0].toLowerCase()}${name.slice(1)}(${untypedParameters(params)}) {`);
  }
  if (language === "php") {
    source = source.replace(/function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g,
      (_, name, params) => `function ${name}(${untypedParameters(params)}) {`);
    source = source.replace(/foreach\s*\(\s*\$?(\w+)\s+as\s+\$?(\w+)\s*\)/g, "for ($2 in $1)");
  }
  if (language === "kotlin") {
    source = source.replace(/fun\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=\s*(.+)$/gm,
      (_, name, params, value) => `function ${name}(${untypedParameters(params)}) { return ${value}; }`);
    source = source.replace(/for\s*\(\s*(\w+)\s+in\s+([^)]*)\)/g, "for ($1 in $2)");
  }
  if (language === "swift") {
    source = source.replace(/func\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[A-Za-z_][\w<>?\[\]]*\s*)?\{/g,
      (_, name, params) => `function ${name}(${untypedParameters(params)}) {`);
    source = source.replace(/for\s+(\w+)\s+in\s+([^\{]+)\{/g, "for ($1 in $2) {");
  }
  if (language === "go") {
    source = source.replace(/func\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:[A-Za-z_][\w\[\]]*\s*)?\{/g,
      (_, name, params) => `function ${name}(${params.split(",").map((param) => param.trim().split(/\s+/)[0]).join(", ")}) {`);
    source = source.replace(/for\s+_,\s*(\w+)\s*:=\s*range\s+([^\{]+)\{/g, "for ($1 in $2) {");
  }
  if (language === "rust") {
    source = source.replace(/fn\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[A-Za-z_][\w<>?\[\]]*\s*)?\{/g,
      (_, name, params) => `function ${name}(${untypedParameters(params)}) {`);
    source = source.replace(/for\s+(\w+)\s+in\s+([^\{]+)\{/g, "for ($1 in $2) {");
  }
  if (language === "scala") {
    source = source.replace(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?::\s*[A-Za-z_][\w<>\[\]]*)?\s*=\s*(.+)$/gm,
      (_, name, params, value) => `function ${name}(${untypedParameters(params)}) { return ${value}; }`);
    source = source.replace(/for\s*\(\s*(\w+)\s*<-\s*([^)]+)\)\s*(.+)$/g, "for ($1 in $2) { $3; }");
  }
  if (language === "cpp") {
    source = source.replace(/for\s*\(\s*auto\s+(\w+)\s*:\s*([^)]+)\)/g, "for ($1 in $2)");
  }
  if (language === "java") {
    source = source.replace(/for\s*\(\s*(?:var|[A-Za-z_]\w*(?:<[^>]+>)?)\s+(\w+)\s*:\s*([^)]+)\)/g, "for ($1 in $2)");
  }
  if (language === "csharp") {
    source = source.replace(/foreach\s*\(\s*(?:var|[A-Za-z_]\w*(?:<[^>]+>)?)\s+(\w+)\s+in\s+([^)]+)\)/g, "for ($1 in $2)");
  }
  if (language === "php") {
    source = source.replace(/foreach\s*\(\s*\$?(\w+)\s+as\s+\$?(\w+)\s*\)/g, "for ($2 in $1)");
  }
  if (language === "dart") {
    source = source.replace(/for\s*\(\s*final\s+(\w+)\s+in\s+([^)]*)\)/g, "for ($1 in $2)");
  }
  if (language === "bash") {
    source = source.replace(/\$\{?(\w+)\[(\d+)\]\}?/g, "$1[$2]");
    source = source.replace(/for\s+(\w+)\s+in\s+[^;]+;\s*do\s*echo\s+\$\w+;?\s*done/g, "for ($1 in items) { print($1); }");
    source = source.replace(/add\(\)\s*\{\s*echo\s+\$\(\(\s*\$1\s*\+\s*\$2\s*\)\)\s*;?\s*\}/g, "function add(a, b) { return a + b; }");
  }
  if (language === "perl") {
    source = source.replace(/sub\s+add\s*\{\s*return\s+\$_\[0\]\s*\+\s*\$_\[1\];?\s*\}/g,
      "function add(a, b) { return a + b; }");
    source = source.replace(/for\s+my\s+\$?(\w+)\s+\(@\w+\)\s*\{\s*print\s*\(?\s*\$?\w+\s*\)?;?\s*\}/g,
      "for ($1 in items) { print($1); }");
  }
  if (language === "r") {
    source = source.replace(/(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{\s*return\s*\(([^)]+)\)\s*\}/g,
      (_, name, params, value) => `function ${name}(${untypedParameters(params)}) { return ${value}; }`);
  }
  return source;
}
