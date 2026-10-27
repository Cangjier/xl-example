// T3 preload: open the BracketCreate trigger before tshape-judge builds anything.
// Usage: node --require ./tmp/preload-on.cjs typescript/cases/tts/tools/tshape-judge.mjs ts <case>
const path = require("node:path");
const { StatementRouteUtil } = require(
  path.join(__dirname, "..", "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"),
);
StatementRouteUtil.EnableBracketCreatePossible = true;
