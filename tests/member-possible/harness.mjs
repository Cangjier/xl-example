// 接口体成员候选的隔离对拍工具。
//
//   node tests/member-possible/harness.mjs                      # 默认用例（属性签名系列），只留 Property
//   node tests/member-possible/harness.mjs --only=PropertySignaturePossibleShape
//   node tests/member-possible/harness.mjs --only=PropertySignaturePossibleShape,MethodSignaturePossibleShape
//   node tests/member-possible/harness.mjs --all                # 不裁剪候选（未实现的候选仍是桩，会崩）
//   node tests/member-possible/harness.mjs --from-cases         # 从 typescript/cases/*.ts 自动挑「只含属性签名接口」的用例
//   node tests/member-possible/harness.mjs --file=cases.json    # JSON 字符串数组，逐个源码
//   node tests/member-possible/harness.mjs --verbose
//
// 对拍口径与 ast-json.mjs / ast-json-diff.mjs 完全一致：TS 侧 ts.createSourceFile + ast-compare.tsAst，
// 本仓侧 SourceFileRunner.Parse + ast-compare.cjAst，逐节点比较 kind / pos / end / text / name。
//
// 隔离办法是**运行时 monkeypatch** `InterfaceDeclarationShape.CreateBodyPossibleShapesCache`
// （xl 生成的 JS 里 private static 字段在运行期可写），不改任何源码；进程退出即还原。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAstCore, cjAst, flatten, kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));
const { InterfaceDeclarationShape } = require(
  path.join(root, "build/ts/typescript/tokens/declarations/interface-declaration-shape.js"),
);

/** 候选类名 → 生成物路径。wave2 把自己的候选加进来即可。 */
const CANDIDATES = {
  PropertySignaturePossibleShape: "typescript/tokens/types/property-signature-possible-shape.js",
  MethodSignaturePossibleShape: "typescript/tokens/types/method-signature-possible-shape.js",
  IndexSignaturePossibleShape: "typescript/tokens/types/index-signature-possible-shape.js",
  CallSignaturePossibleShape: "typescript/tokens/types/call-signature-possible-shape.js",
  ConstructSignaturePossibleShape: "typescript/tokens/types/construct-signature-possible-shape.js",
  GetAccessorPossibleShape: "typescript/tokens/types/get-accessor-possible-shape.js",
  SetAccessorPossibleShape: "typescript/tokens/types/set-accessor-possible-shape.js",
};

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");
const fromCases = argv.includes("--from-cases");
const runAll = argv.includes("--all");
const onlyArg = argv.find((item) => item.startsWith("--only="));
const fileArg = argv.find((item) => item.startsWith("--file="));

/** 默认用例：属性签名的各条边界（注释 / 换行 / 多属性 / 首尾空行 / 无分号 / newline 分隔 / 逗号分隔）。 */
const DEFAULT_CASES = [
  "interface I {}",
  "interface I { a: number; }",
  "interface I { a?: A; }",
  "interface I { readonly b: B; }",
  "interface I { [s]: A; }",
  "interface I { a: A, b: B }",
  "interface I { a: A\n b: B }",
  "interface I { a: A; b: B }",
  "interface I { /* c */ }",
  "interface I { /* c */ a: number; }",
  "interface I {\n\n  a: number;\n\n  b: A;\n\n}",
  "interface I { a: number }",
  "interface I {a:number;b:A;}",
  "interface I { a: A /* c */; b: B }",
  "interface I { \"abort\": Event }",
  "interface I { 0: string; 1: number }",
  "interface I { readonly \"abort\": Event }",
  "interface I { [Symbol.iterator]: void }",
  "interface I { [\"a\"]: A }",
  "interface I { [0]: A }",
  "interface I { readonly [Symbol.toStringTag]: string }",
  "interface I { a?: A | B }",
  "interface I { a?: () => void }",
  "interface I { a?: (a: A) => B }",
  "interface I { a?: readonly A[] }",
  "interface I { a?: A\n b: B }",
  "interface I { a: A\n[B]: C }",
  "interface I { readonly\nreadonly: number }",
  "interface I { readonly\nreadonly?: number }",
  "interface I { a: number }\nconst x = 1",
  "interface I { a: number } // c",
  "interface I { a: number } /* c */",
  "interface I\n{ a: number }",
  "interface I {\n  a: number;\n  b: A;\n}",
  "interface I { a: A;\n b: B }",
];

// ---------------------------------------------------------------------------
// 从 typescript/cases/*.ts 读用例：与 ast-json.mjs 相同的「一行一个用例 + `\n` 编码」口径。
// （多构造快照工具不导出它的 readCases，这里保留同一份解码逻辑，只服务本 harness。）
function decodeCaseText(line) {
  let out = "";
  const stack = [];
  let index = 0;
  while (index < line.length) {
    const ch = line[index];
    const top = stack.length === 0 ? "code" : stack[stack.length - 1];
    if (top === "code") {
      if (ch === "/" && line[index + 1] === "/") {
        out += line.slice(index).replace(/\\n/g, "\n");
        break;
      }
      if (ch === "/" && line[index + 1] === "*") {
        const end = line.indexOf("*/", index + 2);
        const stop = end < 0 ? line.length : end + 2;
        out += line.slice(index, stop).replace(/\\n/g, "\n");
        index = stop;
        continue;
      }
      if (ch === '"') { stack.push("dq"); out += ch; index++; continue; }
      if (ch === "'") { stack.push("sq"); out += ch; index++; continue; }
      if (ch === "`") { stack.push("tpl"); out += ch; index++; continue; }
      if (ch === "/") {
        let p = out.length - 1;
        while (p >= 0 && (out[p] === " " || out[p] === "\t")) p--;
        const prev = p >= 0 ? out[p] : "";
        if (prev === "" || "([{,;:!&|?=+-*%^~<>".includes(prev)) {
          stack.push("regex");
          out += ch; index++; continue;
        }
        out += ch; index++; continue;
      }
      if (ch === "\\" && line[index + 1] === "n") { out += "\n"; index += 2; continue; }
      if (ch === "\\" && line[index + 1] === "v") { out += "\u000B"; index += 2; continue; }
      if (ch === "\\" && line[index + 1] === "f") { out += "\u000C"; index += 2; continue; }
      out += ch; index++; continue;
    }
    if (top === "regex" || top === "class") {
      if (ch === "\\") { out += line.slice(index, index + 2); index += 2; continue; }
      if (top === "regex" && ch === "[") { stack.push("class"); out += ch; index++; continue; }
      if (top === "regex" && ch === "/") { stack.pop(); out += ch; index++; continue; }
      if (top === "class" && ch === "]") { stack.pop(); out += ch; index++; continue; }
      out += ch; index++; continue;
    }
    if (top === "sq" || top === "dq") {
      if (ch === "\\") { out += line.slice(index, index + 2); index += 2; continue; }
      if ((top === "sq" && ch === "'") || (top === "dq" && ch === '"')) {
        stack.pop(); out += ch; index++; continue;
      }
      out += ch; index++; continue;
    }
    if (top === "tpl") {
      if (ch === "\\") { out += line.slice(index, index + 2); index += 2; continue; }
      if (ch === "`") { stack.pop(); out += ch; index++; continue; }
      if (ch === "$" && line[index + 1] === "{") { stack.push("expr"); out += "${"; index += 2; continue; }
      out += ch; index++; continue;
    }
    if (top === "expr") {
      if (ch === "}") { stack.pop(); out += ch; index++; continue; }
      if (ch === '"') { stack.push("dq"); out += ch; index++; continue; }
      if (ch === "'") { stack.push("sq"); out += ch; index++; continue; }
      if (ch === "`") { stack.push("tpl"); out += ch; index++; continue; }
      if (ch === "\\" && line[index + 1] === "n") { out += "\n"; index += 2; continue; }
      out += ch; index++; continue;
    }
    out += ch; index++;
  }
  return out;
}

function readCaseFile(stem) {
  const source = fs.readFileSync(path.join(root, "typescript/cases", `${stem}.ts`), "utf8");
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .map((line) => decodeCaseText(line));
}

/** 只挑「含接口声明、且每个接口成员都是 PropertySignature」的用例，避免未实现的候选把结果污染。 */
function isPropertyOnlyInterfaceCase(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let sawInterface = false;
  let onlyProperty = true;
  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      sawInterface = true;
      for (const member of node.members) {
        if (!ts.isPropertySignature(member)) {
          onlyProperty = false;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return sawInterface && onlyProperty;
}

function collectCases() {
  if (fileArg !== undefined) {
    const file = path.resolve(root, fileArg.slice("--file=".length));
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  if (!fromCases) {
    return DEFAULT_CASES;
  }
  const all = [];
  const dir = path.join(root, "typescript/cases");
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".ts") || !fs.statSync(path.join(dir, name)).isFile()) {
      continue;
    }
    for (const source of readCaseFile(name.slice(0, -3))) {
      if (isPropertyOnlyInterfaceCase(source)) {
        all.push(source);
      }
    }
  }
  return all;
}

/** 按需裁剪接口体候选目录；返回还原函数。 */
function installCandidates(only) {
  const original = InterfaceDeclarationShape.CreateBodyPossibleShapesCache;
  if (only === null) {
    return () => { InterfaceDeclarationShape.CreateBodyPossibleShapesCache = original; };
  }
  const shapes = [];
  for (const name of only) {
    const modulePath = CANDIDATES[name];
    if (modulePath === undefined) {
      throw new Error(`未知候选：${name}；可用：${Object.keys(CANDIDATES).join(", ")}`);
    }
    const loaded = require(path.join(root, "build/ts", modulePath));
    const ShapeClass = loaded[name];
    if (ShapeClass === undefined) {
      throw new Error(`生成物里没有导出 ${name}：${path.join(root, "build/ts", modulePath)}`);
    }
    shapes.push(new ShapeClass());
  }
  InterfaceDeclarationShape.CreateBodyPossibleShapesCache = shapes;
  return () => { InterfaceDeclarationShape.CreateBodyPossibleShapesCache = original; };
}

/** 逐节点比较两份归一树；返回第一处差异的文字描述，全部一致返回 null。 */
function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    const leftKind = kindOf(left.kind);
    const rightKind = kindOf(right.kind);
    if (leftKind !== rightKind) {
      return `#${index} kind: TS=${leftKind} CJ=${rightKind}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${leftKind} range: TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${leftKind} ${field}: TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数：TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

function parseTs(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return file.statements.map(tsAst);
}

function parseCj(source) {
  const rootShape = SourceFileRunner.Parse(source, "case.ts");
  return rootShape.Data.map(cjAst);
}

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) {
      message = String(text);
    }
  }
  return message.split("\n")[0] || "unknown error";
}

function main() {
  let only = ["PropertySignaturePossibleShape"];
  if (runAll) {
    only = null;
  } else if (onlyArg !== undefined) {
    only = onlyArg.slice("--only=".length).split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  }
  const restore = installCandidates(only);
  const cases = collectCases();
  let passed = 0;
  let failed = 0;
  const failures = [];
  try {
    for (const source of cases) {
      let tsNodes = null;
      let cjNodes = null;
      let problem = null;
      try {
        tsNodes = parseTs(source);
      } catch (error) {
        problem = `TS 侧异常：${describeError(error)}`;
      }
      if (problem === null) {
        try {
          cjNodes = parseCj(source);
        } catch (error) {
          problem = `CJ 侧异常：${describeError(error)}`;
        }
      }
      if (problem === null) {
        problem = firstDifference(tsNodes, cjNodes);
      }
      if (problem === null) {
        passed++;
        if (verbose) {
          console.log(`PASS  ${JSON.stringify(source)}`);
        }
      } else {
        failed++;
        failures.push({ source, problem });
        console.log(`FAIL  ${JSON.stringify(source)}`);
        console.log(`      ${problem}`);
      }
    }
  } finally {
    restore();
  }
  const mode = only === null ? "all" : only.join("+");
  console.log(`\n[member-possible] candidates=${mode} cases=${cases.length} pass=${passed} fail=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
