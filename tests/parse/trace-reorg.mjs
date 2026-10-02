/// 重组过程追踪：把每个重组规则在某个单元上的 `Previous` / `Process` 调用打出来。
///
///   node tests/parse/trace-reorg.mjs <文件> <单元类名> [下标或 start 前缀]
///
/// 只在排查「某一层为什么成形/不成形」时用；它不是判据，不进任何一把尺子。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const { Token } = require(path.join(root, "build", "ts", "core", "syntax", "token.js"));

const args = process.argv.slice(2);
const file = args[0];
const owner = args[1] ?? "*";
let source = fs.readFileSync(file, "utf8");
if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);

const label = (t) => {
  if (t === null || t === undefined) return "null";
  const name = t.constructor.name;
  const text = typeof t.TempToString === "function" ? t.TempToString() : t.Value ?? "";
  return `${name}(${text})`;
};

let depth = 0;
const originalReorganize = Token.prototype.Reorganize;
Token.prototype.Reorganize = function Reorganize() {
  if (owner !== "*" && this.constructor.name !== owner) {
    return originalReorganize.call(this);
  }
  const dump = () => this.Data.map(label).join(" ");
  console.log(`${"  ".repeat(depth)}>>> ${this.constructor.name} [${this.SourceRange.Start?.Index},${this.SourceRange.End?.Index}]`);
  console.log(`${"  ".repeat(depth)}    ` + dump());
  if (process.env.TRACE_QUEUE) {
    console.log(`${"  ".repeat(depth)}    queue: ` + (this.ReorganizationQueue?.Data.map((q) => q.constructor.name).join(",") ?? "null"));
  }
  depth++;
  const queue = this.ReorganizationQueue;
  if (queue === null) {
    depth--;
    return;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (const item of queue.Data) {
      const rule = item.constructor.name;
      for (let i = 0; i < this.Data.length; i++) {
        if (item.Previous(this.Template, this.Data, i)) {
          const before = dump();
          const next = item.Process(this.Template, this.Data, i);
          const after = dump();
          if (before !== after) {
            console.log(`${"  ".repeat(depth)}  [p${pass}] ${rule}@${i}: ${before}`);
            console.log(`${"  ".repeat(depth)}        ->  ${after}`);
          }
          i = next;
        }
      }
    }
  }
  console.log(`${"  ".repeat(depth)}<<< ` + dump());
  depth--;
};
Token.prototype.Reorganize = Token.prototype.Reorganize;

const document = new TextDocument(source);
document.FilePath = file;
const context = new TextContext(new Template());
context.Process(document);
void context;
