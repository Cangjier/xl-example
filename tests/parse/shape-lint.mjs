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
// 默认扫的那份源码是**规范**（`typescript/ts-ast.xl.md`）——投影搬家之后表就写在那里；
// `tests/parse/ts-shape.mjs` 只剩转发，扫它等于什么都没扫（而这一点必须**报错**，
// 不是静默通过：表一个都找不到的时候，「没有重复键」是一句空话）。
//
// 两种写法都认（规范的 `# const NAME:<类型>` + 代码块，与老 JS 的 `const NAME = new Map([`），
// 所以搬家前的旧文件也能照样喂进来。
//
//   node tests/parse/shape-lint.mjs                 # 扫规范
//   node tests/parse/shape-lint.mjs --self-test     # 尺子有牙：故意写重一个键，必须被抓到
import fs from "node:fs";
import path from "node:path";

const TABLES = ["KIND_BY_TAG", "FIELD_BY_KIND", "WRAPPER_FIELDS", "BODY_FIELDS", "PRIMITIVE_TYPE_KIND", "KEYWORD_KIND", "TOKEN_KIND"];

/** 找到某个表的 **表体**（从 `new Map([` 的那个 `[` 起，到配对的 `]`），并给出起始行号。 */
function tableBody(source, name) {
  const at = source.search(new RegExp(`(?:^# (?:private )?const ${name}:|^const ${name} =)`, "m"));
  if (at < 0) throw new Error(`找不到表：${name}`);
  const map = source.indexOf("new Map([", at);
  if (map < 0) throw new Error(`找不到表体：${name}`);
  const start = map + "new Map(".length;
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

/** 扫一份源码，返回「重复键 + 找不到的表」的条数（顺手把每一处都打出来）。 */
function lint(source, label) {
  let failed = 0;
  for (const name of TABLES) {
    let found;
    try {
      found = tableBody(source, name);
    } catch (error) {
      console.log(`${label}找不到表  ${name} —— ${error.message}`);
      failed++;
      continue;
    }
    const seen = new Map();
    for (const { text, line } of topLevelKeys(found.body)) {
      const absolute = found.startLine + line - 1;
      if (seen.has(text)) {
        console.log(`${label}重复键  ${name}["${text}"]  第 ${seen.get(text)} 行 与 第 ${absolute} 行 —— 后一条会静默覆盖前一条`);
        failed++;
      } else {
        seen.set(text, absolute);
      }
    }
  }
  return failed;
}

const file = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(process.cwd(), "typescript", "ts-ast.xl.md");
const source = fs.readFileSync(file, "utf8");
const failed = lint(source, "");

let selfTest = "";
if (process.argv.includes("--self-test")) {
  // 故意把 KIND_BY_TAG 的第一个键写两遍：尺子必须有牙。
  const mutated = source.replace('["Root", "SourceFile"],', '["Root", "SourceFile"],\n  ["Root", "SourceFile"],');
  const caught = mutated === source ? -1 : lint(mutated, "自检：");
  selfTest = caught > 0 ? "自检：故意写重的键被抓到了" : "自检失败：故意写重的键没有被抓到";
  console.log(selfTest);
}

if (failed === 0) {
  console.log(`${file}：投影表结构自查通过（没有重复键、${TABLES.length} 张表都在）`);
  process.exit(selfTest.startsWith("自检失败") ? 1 : 0);
}
console.log(`${file}：投影表结构自查发现 ${failed} 处问题`);
process.exit(1);
