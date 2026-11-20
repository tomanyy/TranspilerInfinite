import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../src/web-translator.ts", import.meta.url), "utf8");
const javascript = stripTypeScriptTypes(source, { mode: "strip" });
await writeFile(new URL("../src/web-translator.js", import.meta.url), javascript);
