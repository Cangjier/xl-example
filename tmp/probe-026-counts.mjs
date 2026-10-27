import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));

const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const source = "if (/x/.test(s)) {}";

const keys = Object.keys(StatementRouteUtil).filter((key) => /Count$|Fallback$|LastFileFallback|BracketCreate/i.test(key));
for (const flag of [false, true]) {
  for (const key of keys) if (typeof StatementRouteUtil[key] === "number") StatementRouteUtil[key] = 0;
  StatementRouteUtil.LastFileFallback = false;
  StatementRouteUtil.EnableBracketCreatePossible = flag;
  try {
    SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    console.log("parse threw");
  }
  const snapshot = {};
  for (const key of keys) if (typeof StatementRouteUtil[key] === "number") snapshot[key] = StatementRouteUtil[key];
  console.log(`flag=${flag} fallback=${StatementRouteUtil.LastFileFallback}`);
  console.log(JSON.stringify(snapshot, null, 0));
}
