// 样本验收（**只验 AST 形状**）：`samples/*.ts` 与 `*.expected.tsast.json` 逐字节对照。
//
//   node samples/check.mjs            比对，全部一致时退出码 0
//   node samples/check.mjs --update   用当前产物重写夹具
//
// **第 199 轮把测试集收窄到「只留 AST 相关」**：XML 与 AST JSON 两份夹具、
// 以及其余尺子 / 探针（结构 / 边界 / 噪声 / 无损 / 对齐 / 差分 / 组合 / 模糊…）都已删除，
// 这一份只留 **TS 形状出口**（`cjcli --ts-ast`）。
//
// 它与 `cases:tsast` 的分工：那一把比**形状对不对**（逐节点对 `ts.createSourceFile`，
// kind / 区间 / 字段名 / 未映射 / 缺 range / 越界），这一把比**字节稳不稳**
// （键序、坐标、序列化——归一化一把就能盖掉的那些）。
//
// 走 `cjcli <文件> --ts-ast -o <临时文件>` 而不是管道：两端都在「文件」这一层读写，
// 不经过控制台编码。JSON 夹具是紧凑单行、键序由节点的键序决定、`pos` / `end` 由源码下标决定，
// 三者都是确定性的，所以**逐字节比、不做任何归一化**。
//
// **夹具也是「入口」的验收**：除了 `cjcli` 进程，同一份源码还走一遍库 API
// （`new TextContext(...).Process(...)` → `ToJsonText(projectRoot(...))`），并断言两者逐字节相同。
// 少了这一步，「库对了、命令行打歪了」这种问题没有任何尺子看得见。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "build", "ts", "cjcli.js");
const update = process.argv.includes("--update");

const require = createRequire(import.meta.url);
const root = path.resolve(here, "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const { projectRoot, ToJsonText } = require(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));

/** 库 API 解析一份源码 → 紧凑单行 TS 形状 JSON。 */
function tsAstFromLibrary(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return ToJsonText(projectRoot(context.Root.ToList(), source));
}

/** 一份夹具的比对：缺文件 / 不一致都算失败，并把首个差异位置打出来。 */
function checkOne(name, expectedPath, actual) {
  if (!fs.existsSync(expectedPath)) {
    console.log(`MISSING  ${name}: 没有 ${path.basename(expectedPath)}（用 --update 生成）`);
    return false;
  }
  const expected = fs.readFileSync(expectedPath, "utf8").trim();
  if (actual === expected) {
    console.log(`ok       ${name} [TS 形状]`);
    return true;
  }
  console.log(`DIFF     ${name} [TS 形状]`);
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

const samples = fs
  .readdirSync(here)
  .filter((name) => name.endsWith(".ts"))
  .sort();

let failed = 0;
for (const name of samples) {
  const source = path.join(here, name);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cjcli-"));
  const expectedPath = path.join(here, name.replace(/\.ts$/, ".expected.tsast.json"));
  const actualPath = path.join(tempDir, "actual.tsast.json");
  execFileSync(process.execPath, [cli, source, "--ts-ast", "-o", actualPath], { stdio: "ignore" });
  const actual = fs.readFileSync(actualPath, "utf8").trim();

  if (update) {
    const previous = fs.existsSync(expectedPath) ? fs.readFileSync(expectedPath, "utf8").trim() : null;
    if (previous !== actual) fs.writeFileSync(expectedPath, actual, "utf8");
    console.log(`updated  ${name}`);
    continue;
  }

  // **命令行 = 库 API**：同一份源码两条路的输出必须逐字节相同。
  const library = tsAstFromLibrary(fs.readFileSync(source, "utf8"), source).trim();
  if (library !== actual) {
    failed++;
    console.log(`ENTRY    ${name}: 命令行与库 API 的 TS 形状输出不一致`);
    continue;
  }

  if (!checkOne(name, expectedPath, actual)) failed++;
}

process.exitCode = failed === 0 ? 0 : 1;
