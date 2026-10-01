// 表结构自查：**扫源码**找出投影表里的重复键。
//
// 为什么需要它：`FIELD_BY_KIND` / `KIND_BY_TAG` / `WRAPPER_FIELDS` 都是 `new Map([...])`
// 字面量，**同一个键写两遍时后一条会静默覆盖前一条**——`Map` 的键唯一，构造不报错。
// 症状是「某个字段名整类不对」，而看差异表根本看不出是「表里写重了」。
// 这个坑在本仓库踩过两次（`ClassDeclaration`、`MethodDeclaration`），所以加一把尺子钉住。
//
// 做法是**读源码文本**而不是读运行时对象：运行时那个 `Map` 已经把重复键吃掉了，
// 从对象上看不出任何异常。
//
//   node tests/parse/shape-lint.mjs
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] ?? path.join(process.cwd(), "tests", "parse", "ts-shape.mjs");
const source = fs.readFileSync(file, "utf8");

/** 从 `const NAME = new Map([` 起，找到与它配对的 `]);`（同时给出表体的起始行号）。 */
function tableBody(name) {
  const at = source.indexOf(`const ${name} = new Map([`);
  if (at < 0) throw new Error(`找不到表：${name}`);
  const start = source.indexOf("[", at);
  const startLine = source.slice(0, start).split("\n").length;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) return { body: source.slice(start, i + 1), startLine };
    }
  }
  throw new Error(`表没有闭合：${name}`);
}

/**
 * 取出**顶层**条目的键。
 *
 * 只看括号深度为 1 的那一层，所以嵌套的 `new Map([["children", …]])` 里的字符串不会被误当成键。
 */
function topLevelKeys(body) {
  const keys = [];
  let depth = 0;
  let i = 0;
  let line = 1;
  while (i < body.length) {
    const ch = body[i];
    if (ch === "\n") line++;
    if (ch === "[") depth++;
    else if (ch === "]") depth--;
    else if (depth === 2 && ch === '"') {
      // 条目的第一个字符串就是键
      let j = i + 1;
      let text = "";
      while (j < body.length && body[j] !== '"') {
        if (body[j] === "\\") j++;
        text += body[j];
        j++;
      }
      // 只有「键后面紧跟 ,」才算条目键（值也有可能是字符串，例如 KIND_BY_TAG 的映射值）
      const rest = body.slice(j + 1, j + 12);
      if (/^\s*,/.test(rest)) keys.push({ text, line });
      i = j;
    }
    i++;
  }
  return keys;
}

let failed = 0;
for (const name of ["KIND_BY_TAG", "FIELD_BY_KIND", "WRAPPER_FIELDS", "BODY_FIELDS", "PRIMITIVE_TYPE_KIND", "KEYWORD_KIND", "TOKEN_KIND"]) {
  let found;
  try {
    found = tableBody(name);
  } catch {
    continue;
  }
  const seen = new Map();
  for (const { text, line } of topLevelKeys(found.body)) {
    const absolute = found.startLine + line - 1;
    if (seen.has(text)) {
      console.log(`重复键  ${name}["${text}"]  第 ${seen.get(text)} 行 与 第 ${absolute} 行 —— 后一条会静默覆盖前一条`);
      failed++;
    } else {
      seen.set(text, absolute);
    }
  }
}

if (failed === 0) {
  console.log("投影表结构自查：没有重复键（同一个 kind 只登记一次）");
  process.exit(0);
}
console.log(`投影表结构自查：发现 ${failed} 处重复键`);
process.exit(1);
