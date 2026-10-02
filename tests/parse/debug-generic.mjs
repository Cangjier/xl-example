/// 一次性排查脚本：`<` 处的 `GenericTypeBranch.Condition` 为什么不成。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const { GenericTypeBranch } = require(path.join(root, "build", "ts", "typescript", "tokens", "generic-type.js"));

const args = process.argv.slice(2);
let source = fs.readFileSync(args[0], "utf8");
if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);

const proto = GenericTypeBranch.prototype;
const originalCondition = proto.Condition;
proto.Condition = function (context, unit, src) {
  const result = originalCondition.call(this, context, unit, src);
  if (src.Value === "<") {
    const dump = unit.Data.map((d) => d.constructor.name + "(" + (typeof d.TempToString === "function" ? d.TempToString() : d.Value ?? "") + ")").join(" ");
    console.log(`< at ${src.Index}: host=${unit.constructor.name} success=${result.Success}`);
    console.log(`    ${dump}`);
    console.log(`    ScanArguments=${this.ScanArguments(unit, src)}`);
  }
  return result;
};
const originalIsGenericStart = proto.IsGenericStart;
proto.IsGenericStart = function (unit, src) {
  const r = originalIsGenericStart.call(this, unit, src);
  if (src.Value === "<") console.log(`    IsGenericStart=${r} last=${unit.Last()?.constructor.name}`);
  return r;
};

const document = new TextDocument(source);
document.FilePath = args[0];
const context = new TextContext(new Template());
context.Process(document);
