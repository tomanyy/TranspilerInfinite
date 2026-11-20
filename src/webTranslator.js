import { LANGUAGES, languageConfig } from "./languageRegistry.js";
import { tokenize } from "./lexer.js";
import { Parser } from "./parser.js";
import { renderStatements } from "./codeGenerator.js";
import * as sourceNormalizers from "./sourceNormalizers.js";

export { LANGUAGES };

export function translate(source, from, to) {
  const config = languageConfig(from);
  const normalize = config.normalizer ? sourceNormalizers[config.normalizer] : undefined;
  const normalized = normalize ? normalize(source) : source;
  const program = new Parser(tokenize(normalized, from), from).program();
  return renderStatements(program, to, from).join("\n");
}
