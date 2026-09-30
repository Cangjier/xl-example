// 打印完整诊断（cjcli 只截了一部分）
import fs from "node:fs";
import { Template } from "../build/ts/core/syntax/templates/template.js";
import { TextDocument } from "../build/ts/dawn/text/text-document.js";
import { TextContext } from "../build/ts/dawn/text/text-context.js";

const content = fs.readFileSync(process.argv[2], "utf8");
const template = new Template();
const document = new TextDocument(content);
document.FilePath = process.argv[2];
const context = new TextContext(template);
try {
  context.Process(document);
  console.log("OK");
} catch (error) {
  console.log("=== error name:", error?.constructor?.name);
  console.log("=== Message:", String(error?.Message ?? error?.message ?? error).slice(0, 4000));
  let current = error;
  for (let depth = 0; depth < 12 && current !== null && current !== undefined; depth++) {
    const name = current.constructor?.name;
    const message = String(current.Message ?? current.message ?? current).split("\n")[0].slice(0, 300);
    console.log(`--- depth ${depth}: ${name}: ${message}`);
    if (name !== "SyntaxException") {
      console.log(String(current.stack ?? "").split("\n").slice(0, 14).join("\n"));
      break;
    }
    console.log(String(current.InnerException?.stack ?? "").split("\n").slice(0, 8).join("\n"));
    current = current.InnerException;
  }
}
