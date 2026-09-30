// 样本验收：samples/*.cj 与其 *.expected.xml 逐字节对照。
//
//   node samples/check.mjs            比对，全部一致时退出码 0
//   node samples/check.mjs --update   用当前产物重写 *.expected.xml
//
// 走 `cjcli <文件> -o <临时文件>` 而不是管道：cjcli 的 `-o` 形式会把 `><` 拆成换行，
// 于是两端都在「文件」这一层读写，不经过控制台编码，中文注释不会在比对里被搅坏。
// 比对前把拆行还原成一行——夹具文件是单行 XML（与 hello.expected.xml 同形）。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cli = path.join(root, "build", "ts", "cjcli.js");
const update = process.argv.includes("--update");

/** 产物拆行 ↔ 单行夹具之间的换算：`>\n<` 与 `><` 等价。 */
function normalize(text) {
  return text.split(">\n<").join("><").trim();
}

const samples = fs
  .readdirSync(here)
  .filter((name) => name.endsWith(".ts"))
  .sort();

let failed = 0;
for (const name of samples) {
  const source = path.join(here, name);
  const expectedPath = path.join(here, name.replace(/\.ts$/, ".expected.xml"));
  const actualPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cjcli-")), "actual.xml");

  execFileSync(process.execPath, [cli, source, "-o", actualPath], { stdio: "ignore" });
  const actual = normalize(fs.readFileSync(actualPath, "utf8"));

  if (update) {
    // 不带结尾换行——与 hello.expected.xml 的字节形态一致，`--update` 才不会顺手改动它
    const previous = fs.existsSync(expectedPath) ? fs.readFileSync(expectedPath, "utf8") : null;
    if (previous === actual) {
      console.log(`ok       ${name}`);
      continue;
    }
    fs.writeFileSync(expectedPath, actual, "utf8");
    console.log(`updated  ${path.relative(root, expectedPath)}`);
    continue;
  }

  if (!fs.existsSync(expectedPath)) {
    failed++;
    console.log(`MISSING  ${name}: 没有 ${path.basename(expectedPath)}（用 --update 生成）`);
    continue;
  }
  const expected = normalize(fs.readFileSync(expectedPath, "utf8"));
  if (actual === expected) {
    console.log(`ok       ${name}`);
    continue;
  }
  failed++;
  console.log(`DIFF     ${name}`);
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
}

process.exitCode = failed === 0 ? 0 : 1;
