// T3: same probe as tmp/target-cases.mjs, but flips EnableBracketCreatePossible
// to true BEFORE the first Parse. Everything else (args, table, exit code) is
// exactly target-cases.mjs.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const route = require(
  path.join(root, "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"),
).StatementRouteUtil;
route.EnableBracketCreatePossible = true;
await import("./target-cases.mjs");
