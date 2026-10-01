// 样本验收：samples/*.ts 与其 *.expected.xml / *.expected.ast.json 逐字节对照。
//
//   node samples/check.mjs            比对，全部一致时退出码 0
//   node samples/check.mjs --update   用当前产物重写夹具
//
// 走 `cjcli <文件> -o <临时文件>` 而不是管道：两端都在「文件」这一层读写，
// 不经过控制台编码，中文注释不会在比对里被搅坏。
//
// `cjcli` 现在打印**缩进**过的 XML，而夹具是紧凑单行。比对前把标签之间的空白全部去掉，
// 于是「缩进怎么排」不再是判据——判据回到「标签、属性、文本内容是否逐字节相同」。
// 属性值里的空白不受影响：`CommonUtil.XmlDecode` 把换行 / 制表符都写成了 `\n` / `\t` 转义。
//
// **AST JSON 夹具是逐字节比的**（`--ast-json` 出口）：它是紧凑单行、键序由规范里的
// `result.set(...)` 顺序决定、`range` 由源码下标决定，三者都是确定性的，
// 所以这里不做任何归一化——归一化只会把「键序变了」这类漂移盖掉。
// 两个出口的形态差异（缩进 / 空白的处理）本身就是被验收的东西之一。
//
// **夹具是「入口」的验收**：两个出口都走 `cjcli` 进程，同时也走一遍库 API
// （`new TextContext(...).Process(...)` → `Root.ToXmlString()` / `Root.ToJsonString()`），
// 并断言两者**逐字节相同**。少了这一步，「库对了、命令行打歪了」这种问题没有任何尺子看得见
// （`tests/parse/ast-json.mjs` 只走库 API）。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "build", "ts", "cjcli.js");
const update = process.argv.includes("--update");

// 库 API 的那一份：与 `cjcli` 走同一个入口（`TextContext.Process`），
// 用来钉住「命令行打出来的东西 = 库产出的东西」。
const require = createRequire(import.meta.url);
const root = path.resolve(here, "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

/** 缩进形态 ↔ 紧凑形态之间的换算：标签之间的一切空白都丢掉。 */
function normalize(text) {
  return text.replace(/>\s+</g, "><").trim();
}

/** 用库 API 解析一段源码，返回 `{ xml, json }`。 */
function parseWithLibrary(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return { xml: context.Root.ToXmlString(), json: context.Root.ToJsonString() };
}

const samples = fs
  .readdirSync(here)
  .filter((name) => name.endsWith(".ts"))
  .sort();

let failed = 0;
for (const name of samples) {
  const source = path.join(here, name);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cjcli-"));
  const expectedPath = path.join(here, name.replace(/\.ts$/, ".expected.xml"));
  const actualPath = path.join(tempDir, "actual.xml");

  execFileSync(process.execPath, [cli, source, "-o", actualPath], { stdio: "ignore" });
  const actual = normalize(fs.readFileSync(actualPath, "utf8"));

  const jsonExpectedPath = path.join(here, name.replace(/\.ts$/, ".expected.ast.json"));
  const jsonActualPath = path.join(tempDir, "actual.ast.json");
  execFileSync(process.execPath, [cli, source, "--ast-json", "-o", jsonActualPath], { stdio: "ignore" });
  const jsonActual = fs.readFileSync(jsonActualPath, "utf8").trim();

  if (update) {
    // 不带结尾换行——与 hello.expected.xml 的字节形态一致，`--update` 才不会顺手改动它
    const previous = fs.existsSync(expectedPath) ? fs.readFileSync(expectedPath, "utf8") : null;
    if (previous !== actual) fs.writeFileSync(expectedPath, actual, "utf8");
    const previousJson = fs.existsSync(jsonExpectedPath) ? fs.readFileSync(jsonExpectedPath, "utf8").trim() : null;
    if (previousJson !== jsonActual) fs.writeFileSync(jsonExpectedPath, jsonActual, "utf8");
    console.log(`updated  ${name}`);
    continue;
  }

  const library = parseWithLibrary(fs.readFileSync(source, "utf8"), source);
  const sameXml = normalize(library.xml) === actual;
  const sameJson = library.json.trim() === jsonActual;
  if (!sameXml || !sameJson) {
    failed++;
    console.log(`ENTRY    ${name}: 命令行与库 API 的输出不一致（XML ${sameXml ? "同" : "不同"} / JSON ${sameJson ? "同" : "不同"}）`);
    continue;
  }

  const ok = checkOne(name, expectedPath, actual, "XML");
  const okJson = checkOne(name, jsonExpectedPath, jsonActual, "AST JSON");
  if (ok && okJson) continue;
  failed++;
}

/** 一份夹具的比对：缺文件 / 不一致都算失败，并把首个差异位置打出来。 */
function checkOne(name, expectedPath, actual, kind) {
  if (!fs.existsSync(expectedPath)) {
    console.log(`MISSING  ${name}: 没有 ${path.basename(expectedPath)}（用 --update 生成）`);
    return false;
  }
  const expected = kind === "XML" ? normalize(fs.readFileSync(expectedPath, "utf8")) : fs.readFileSync(expectedPath, "utf8").trim();
  if (actual === expected) {
    console.log(`ok       ${name} [${kind}]`);
    return true;
  }
  console.log(`DIFF     ${name} [${kind}]`);
  const limit = Math.min(actual.length, expected.length);
  let at = limit;
  for (let i = 0; i < limit; i++) {
    if (actual[i] !== expected[i]) {
      at = i;
      break;
    }
  }
  console.log(`         first difference at ${at}`);
  console.log(`         expected: ${expected.slice(Math.max(0, at - 60), at + 90)}`);
  console.log(`         actual:   ${actual.slice(Math.max(0, at - 60), at + 90)}`);
  return false;
}

process.exitCode = failed === 0 ? 0 : 1;
