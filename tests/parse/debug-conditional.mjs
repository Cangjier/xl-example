/// 一次性排查脚本：看 `ConditionalTypeReorganization.Previous` 在某个文件上被问到时怎么答的。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const rules = require(path.join(root, "build", "ts", "typescript", "parse-pipeline.js"));

const args = process.argv.slice(2);
let source = fs.readFileSync(args[0], "utf8");
if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);

const CT = rules.ParsePipeline.GeneralReorganize.Data.find((r) => r.constructor.name === "ConditionalTypeReorganization");
const original = CT.Previous.bind(CT);
CT.Previous = function (template, units, index) {
  const item = units[index];
  const isQuestion = item && typeof item.Is === "function" && item.Is("?");
  if (isQuestion) {
    const ext = this.FindExtendsIndex(units, index);
    console.log(`Previous?@${index} extends=${ext} parent=${item.Parent?.constructor.name} list=${units.map((u) => u.constructor.name).join(",")}`);
  }
  return original(template, units, index);
};

const document = new TextDocument(source);
document.FilePath = args[0];
const context = new TextContext(new Template());
context.Process(document);
