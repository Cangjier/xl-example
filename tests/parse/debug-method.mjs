/// 一次性排查脚本：看 `MethodDeclarationReorganization.Previous` 在某个文件上为什么成立。
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

const MD = rules.ParsePipeline.GeneralReorganize.Data.find((r) => r.constructor.name === "MethodDeclarationReorganization");
const original = MD.Previous.bind(MD);
MD.Previous = function (template, units, index) {
  const item = units[index];
  const word = item && (typeof item.TempToString === "function" ? item.TempToString() : item.Value);
  const result = original(template, units, index);
  if (result && word === "g") {
    console.log(`Previous@${index} name=${word} parent=${item.Parent?.constructor.name}`);
    console.log("   " + units.map((u) => u.constructor.name + "(" + (typeof u.TempToString === "function" ? u.TempToString() : u.Value ?? "") + ")").join(" "));
    const parametersIndex = this.ParameterIndex(units, index);
    console.log(`   parametersIndex=${parametersIndex} after=${parametersIndex >= 0 ? units[parametersIndex + 1]?.constructor.name : "-"}`);
  }
  return result;
};

const document = new TextDocument(source);
document.FilePath = args[0];
const context = new TextContext(new Template());
context.Process(document);
