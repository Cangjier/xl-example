// C++ 产物的自检（没有编译器时的替代品）。用法：node tests/cpp/check.mjs
//
// 为什么需要它：`dist/cpp/` 下的产物**一次都没被编译过**（本机没有 C++ 工具链），
// 而 `xl_emit` 的契约校验只管「类型集 / 成员名 / 参数个数」这三项结构回读，
// 管不到跨文件一致性。这个脚本把能自动查的那些都查了：
//
//   1. 头文件守卫：`.h` 恰好一组 `#ifndef/#define/#endif`，且宏名与文件名对得上；
//      `.cpp` 里**不该**出现任何预处理指令（那多半是从 `.h` 抄格式抄错了）。
//   2. 花括号配对（最粗的一道语法代理）。
//   3. `#include "…"` 都能解析到真实存在的文件（相对 `dist/cpp/`）。
//   4. **用了 `std::xxx` 就必须包含对应的标准头**——这一条是本脚本自己的价值所在：
//      手写产物时「忘了 `#include <functional>`」不会让别的东西红，只会在编译时炸。
//   5. 规范里的成员名都能在产物里找到（补偿手写落盘的那些单元没跑 `xl_emit` 契约校验）。
//   6. **抽到 0 个名字 / 0 个文件就视为红**：空跑的检查比没有检查更糟。
//
// 它替代不了编译器，也**不假装**能：语义错、类型错、重载解析，只有编译器说了算。

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cppRoot = join(root, "dist", "cpp");

// 已经交付 C++ 产物的规范（新的单元做完就加进来；没列出的整单元跳过）。
const delivered = [
  "runtime/value.xl.md",
  "runtime/gc.xl.md",
  "runtime/ir.xl.md",
  "runtime/heap.xl.md",
  "runtime/frame.xl.md",
  "runtime/props.xl.md",
  "runtime/rt.xl.md",
  "runtime/link.xl.md",
  "runtime/ir-verify.xl.md",
  "runtime/vm.xl.md",
  "runtime/host-abi.xl.md",
  "typescript-exec/bindings.xl.md",
  "typescript-exec/builtins/array.xl.md",
  "typescript-exec/builtins/string.xl.md",
  "typescript-exec/builtins/map.xl.md",
  "typescript-exec/builtins/set.xl.md",
  "typescript-exec/builtins/globals.xl.md",
];

// 用到的标准类型 → 必须出现的头（这一条只查「用了却没包含」，**按 include 传递闭包判**：
// `.cpp` 经由自己的头文件间接拿到 `<vector>` 是完全合法的，直接要求每个文件都写一遍会满屏误报）。
const stdHeaders = [
  [/\bstd::function\b/, "functional"],
  [/\bstd::optional\b/, "optional"],
  [/\bstd::vector\b/, "vector"],
  [/\bstd::string\b/, "string"],
  [/\bstd::to_string\b/, "string"],
  [/\bstd::runtime_error\b/, "stdexcept"],
  [/\bstd::fmod\b|\bstd::trunc\b/, "cmath"],
  [/\bint32_t\b|\bint64_t\b|\buint32_t\b/, "cstdint"],
];

/** 剥掉注释：注释里提到 `std::fmod` 不该算「用了它」。 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

const problems = [];
const note = (text) => problems.push(text);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "build") continue;
      out.push(...walk(full));
    } else if (name.endsWith(".h") || name.endsWith(".cpp")) {
      out.push(full);
    }
  }
  return out;
}

if (!existsSync(cppRoot)) {
  console.error("找不到 dist/cpp —— 先跑 xl_emit 生成 C++ 产物");
  process.exit(1);
}

const files = walk(cppRoot);
const rel = (full) => relative(cppRoot, full).split("\\").join("/");
const existing = new Set(files.map(rel));

// 每个文件「经由 include 能拿到哪些标准头」——含它自己、以及它包含的整条链。
const ownStd = new Map();
const ownProject = new Map();
for (const full of files) {
  const text = stripComments(readFileSync(full, "utf8"));
  ownStd.set(rel(full), new Set([...text.matchAll(/#include <([^>]+)>/g)].map((m) => m[1])));
  ownProject.set(rel(full), [...text.matchAll(/#include "([^"]+)"/g)].map((m) => m[1]));
}
const closureCache = new Map();
function stdClosure(name) {
  if (closureCache.has(name)) return closureCache.get(name);
  const out = new Set(ownStd.get(name) || []);
  closureCache.set(name, out);
  for (const next of ownProject.get(name) || []) {
    if (!existing.has(next)) continue;
    for (const header of stdClosure(next)) out.add(header);
  }
  return out;
}

let includeCount = 0;
let body = "";
for (const full of files) {
  const text = readFileSync(full, "utf8");
  body += text + "\n";
  const name = rel(full);
  const isHeader = full.endsWith(".h");

  // 1. 守卫
  const guards = (text.match(/#ifndef/g) || []).length;
  const endifs = (text.match(/#endif/g) || []).length;
  const defines = (text.match(/#define/g) || []).length;
  if (isHeader) {
    if (guards !== 1 || endifs !== 1 || defines !== 1) {
      note(`${name}: 头文件守卫不是恰好一组（ifndef=${guards} define=${defines} endif=${endifs}）`);
    } else {
      const want = "CANGJIE_" + basename(full, ".h").toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_H";
      if (!text.includes(want)) note(`${name}: 守卫宏与文件名不符（期望 ${want}）`);
    }
  } else if (guards || endifs || defines) {
    note(`${name}: 源文件里出现了预处理指令（多半是从 .h 抄格式抄错了）`);
  }

  // 2. 花括号
  const open = (text.match(/\{/g) || []).length;
  const close = (text.match(/\}/g) || []).length;
  if (open !== close) note(`${name}: 花括号不配对（左=${open} 右=${close}）`);

  // 3. include 解析
  for (const m of text.matchAll(/#include "([^"]+)"/g)) {
    includeCount++;
    if (!existing.has(m[1])) note(`${name}: 悬空 include -> ${m[1]}`);
  }

  // 4. 标准头（**按传递闭包判**：`.cpp` 经由自己的头文件拿到 `<vector>` 是合法的；
  //    注释里提到 `std::fmod` 不算「用了它」）。
  const code = stripComments(text);
  const reachable = stdClosure(name);
  for (const [pattern, header] of stdHeaders) {
    if (pattern.test(code) && !reachable.has(header)) {
      note(`${name}: 用了 ${pattern.source}，而它和它包含的头里都没有 <${header}>`);
    }
  }
}

// 5. 成员名
let memberCount = 0;
for (const spec of delivered) {
  const full = join(root, spec);
  if (!existsSync(full)) {
    note(`已交付清单里的规范不存在：${spec}`);
    continue;
  }
  const text = readFileSync(full, "utf8");
  const matches = [...text.matchAll(/^#{1,2} (?:static )?(?:method|field|type|const|class|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)];
  for (const m of matches) {
    memberCount++;
    const word = new RegExp("\\b" + m[1] + "\\b");
    if (!word.test(body)) note(`${spec}: 产物里找不到成员名 ${m[1]}`);
  }
}

// 6. 空跑即红
if (files.length === 0) note("一个 C++ 产物都没有（检查空跑）");
if (memberCount === 0) note("一个成员名都没抽到（检查空跑）");

const summary = `${files.length} 个文件 · ${includeCount} 条 include · ${memberCount} 个成员名`;
if (problems.length > 0) {
  for (const p of problems) console.error("  " + p);
  console.error(`C++ 自检：${summary} —— ${problems.length} 条问题`);
  process.exit(1);
}
console.log(`C++ 自检：${summary} —— 全部通过`);
