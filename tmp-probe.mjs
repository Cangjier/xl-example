import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "./typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(path.join(here, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(here, "build/ts/typescript/run/source-file-runner.js"));
const { tsAst } = createAstCore(ts);

const texts = process.argv.slice(2);
for (const src of texts) {
  const text = src.replace(/\\n/g, "\n");
  console.log("=== " + JSON.stringify(text));
  const file = ts.createSourceFile("t.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  console.log("ts : " + JSON.stringify(file.statements.map(tsAst)));
  try {
    const root = SourceFileRunner.Parse(text, "t.ts");
    console.log("cj : " + JSON.stringify(root.Data.map(cjAst)));
  } catch (e) {
    console.log("cj ERR: " + (e && e.message));
  }
}
