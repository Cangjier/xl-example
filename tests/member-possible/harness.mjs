// 接口体成员候选的隔离对拍工具。
//
//   node tests/member-possible/harness.mjs                      # 默认用例（属性签名系列），只留 Property
//   node tests/member-possible/harness.mjs --only=PropertySignaturePossibleShape
//   node tests/member-possible/harness.mjs --only=PropertySignaturePossibleShape,MethodSignaturePossibleShape
//   node tests/member-possible/harness.mjs --all                # 不裁剪候选（未实现的候选仍是桩，会崩）
//   node tests/member-possible/harness.mjs --from-cases         # 从 typescript/cases/astjson/*.ts 自动挑「只含属性签名接口」的用例
//   node tests/member-possible/harness.mjs --file=cases.json    # JSON 字符串数组，逐个源码
//   node tests/member-possible/harness.mjs --no-generic         # 跳过泛型边界回归分组（默认跑，按候选自动启用）
//   node tests/member-possible/harness.mjs --verbose
//
// 对拍口径与 ast-json.mjs / ast-json-diff.mjs 完全一致：TS 侧 ts.createSourceFile + ast-compare.tsAst，
// 本仓侧 SourceFileRunner.Parse + ast-compare.cjAst，逐节点比较 kind / pos / end / text / name。
//
// 隔离办法是**运行时 monkeypatch** `InterfaceDeclarationShape.CreateBodyPossibleShapesCache`
// （xl 生成的 JS 里 private static 字段在运行期可写），不改任何源码；进程退出即还原。
//
// `--generic` 分组（默认也跑）：泛型成员边界回归。成员自身的 `<...>` 里，`>` 和 `,` 都是成员内部结构，
// 不能当本层收口证据（`a: Foo<A>`、`a: Map<K, V>`、`m<T, U>(x: T): U` …）。
// 每条用例声明它需要的候选；候选没被选中（还是桩）时该用例跳过，等 wave2 实现后自动生效。
//
// `--member-start` 分组（默认也跑）：成员起点判据回归（residual 修复新增）。`get?` / `set?` 是
// 「名字 + 可选标记」而不是访问器；成员名 / 可选标记 / 类型参数表与 `<` `(` 之间的换行不插 ASI
// （`m` ⏎ `()`、`m<T>` ⏎ `()`、`b?` ⏎ `()`、`typeof import` ⏎ `("m")`），但成员自己收住后
// （有 `:` 类型 / 已有参数表）换行后的 `(` 仍是下一个成员。`--no-generic` 同时跳过这一组。
// `--no-generic` 同时跳过 `--member-start` 与 `--recovery` 两个分组。
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
const noGeneric = argv.includes("--no-generic");
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

/** 泛型成员边界回归（wave1 共享工具 bug）：成员自身 `<...>` 里的 `>` / `,` 不能提前收口。
 *  `required` 是这条用例需要的候选：没被 `--only` 选中（还是桩）时跳过，不污染本分支读数。 */
const GENERIC_BOUNDARY_CASES = [
  { source: "interface I { a: Foo<A>; }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: Array<A> }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a?: Foo<A<B>>; }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: A<B<C>> }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { readonly a: Foo<A, B>; }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: Map<K, V>; }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: Record<string, number>; }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { [Symbol.iterator]: Iterator<A> }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: Map<K, V>\n b: B }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: Map<K, V>; b: Record<A, B> }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { [k: string]: Map<K, V> }", required: ["IndexSignaturePossibleShape"] },
  { source: "interface I { m<T>(x: T): U; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { m<T, U>(x: T): U }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { m(): A<B, C> }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { <T>(x: T): B }", required: ["CallSignaturePossibleShape"] },
  { source: "interface I { new <T>(x: T): B }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { new <U, V>(a: U, b: V): C }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { new <T extends A>(x: T): B }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { new <T>(x: A<B<C>>): D }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { new (): A<B> }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { get a(): Foo<A> }", required: ["GetAccessorPossibleShape"] },
  { source: "interface I { set a(v: A) }", required: ["SetAccessorPossibleShape"] },
  // G2：换行后的 `(` / `<` 是新成员起点（`MemberBoundary.LooksLikeMemberStart`），不能被并成一条。
  { source: "interface I { (): A\n(): B }", required: ["CallSignaturePossibleShape"] },
  { source: "interface I { <T>(x: T): A\n(): B }", required: ["CallSignaturePossibleShape"] },
  { source: "interface I { a: A\n(): B }", required: ["PropertySignaturePossibleShape", "CallSignaturePossibleShape"] },
];

// ---------------------------------------------------------------------------
// `--member-start` 分组（默认也跑）：成员起点判据回归（residual 修复新增）。
//
// 两条共享判据在这里钉住：
//   1. `get?` / `set?`：`?` 紧跟访问器关键字，访问器形态已经不可能 ⇒ `get` / `set` 是成员名，
//      按「名字 + 可选标记」判型（`get?(): any` 是 MethodSignature、`get?: A` 是 PropertySignature）。
//   2. 成员名与 `<` / `(` 之间的换行不插 ASI：`m` ⏎ `()`、`m<T>` ⏎ `()`、`b?` ⏎ `()`、
//      `typeof import` ⏎ `("m")` 都是同一个成员；而成员自己已经收住（有 `:` 类型 / 已有参数表）时，
//      换行后的 `(` / `<` 才是下一个成员（`a: A` ⏎ `(): B`）。
// 每条用例声明它需要的候选；候选没被选中（还是桩）时跳过，等 `--all` 时生效。
const MEMBER_START_CASES = [
  // 1. get / set 可选标记
  { source: "interface I { get?(): any; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { get?(this: This): Value; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { set?(v: string): void; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { get?<T>(): T }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { get?: A }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { get?: (a: A) => B }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { set?: (v: A) => void }", required: ["PropertySignaturePossibleShape"] },
  // 2a. 名字 / 可选标记 / 类型参数表 后面的换行参数表属于同一个成员
  { source: "interface I { a: number; m\n(): void; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { a: number; m//c\n(): void; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { m<T>/*c*/(a: T): void; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { m<T>\n(a: T): void; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { m<T, U>\n(a: T, b: U): void; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { b?\n(): E; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { b?/*c*/\n(): E; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { b?<T>\n(x: T): E; }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { \"m\"\n(): void }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { readonly x\n(): A }", required: ["MethodSignaturePossibleShape"] },
  // 2b. `typeof import` 的参数表跨换行
  { source: "interface I { f: typeof import\n(\"m\") }", required: ["PropertySignaturePossibleShape"] },
  { source: "type B = { f: typeof import\n(\"m\") };", required: ["PropertySignaturePossibleShape"] },
  // 2c. 成员自己已经收住时，换行后的 `(` 仍是下一个成员
  { source: "interface I { a: A\n(): B }", required: ["PropertySignaturePossibleShape", "CallSignaturePossibleShape"] },
  { source: "interface I { [k: string]: A\n(): B }", required: ["IndexSignaturePossibleShape"] },
  { source: "interface I { a: A\nnew (): B }", required: ["ConstructSignaturePossibleShape"] },
  // 2d. `readonly` 换行后是计算名成员：`readonly` 收成无类型属性名，`(` 属于下一个成员
  { source: "interface I { readonly\n[Symbol.iterator](): T }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
];

// `--recovery` 分组（默认也跑）：非法源码恢复回归（fix/invalid-recovery）。
// 同行缺分隔符的接口成员列表：TS 不插 ASI，但类型在第一条成员的类型处就收住，后面是下一条成员。
// 增量路径的收口证据 3（后面是容器收口字符）会把整段当一条成员；`BuildByIndex` 建不完整时必须
// 回落成 raw、由收口时的 `BuildMembers` 按重构前口径逐成员恢复，而不是从 `Parse` 里抛异常。
const RECOVERY_CASES = [
  { source: "interface A { a: number b: string }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { a: number /* c */ b: string }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { m(): void /* c */ n(): void }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface A { a: number b: string c: boolean }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { a: string[] b: number }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { a: string | number b: number }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { a: Map<K,V> b: number }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { a?: number b?: string }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface A { [k: string]: A b: number }", required: ["IndexSignaturePossibleShape"] },
  { source: "interface A { a: number; b: string c: boolean }", required: ["PropertySignaturePossibleShape"] },
  // 七个候选各走一遍「同行两条成员」：建不完整时都必须回落，不允许从 Parse 冒异常。
  { source: "interface A { (): void (): string }", required: ["CallSignaturePossibleShape"] },
  { source: "interface A { <T>(x: T): U <U>(y: U): V }", required: ["CallSignaturePossibleShape"] },
  { source: "interface A { new (): A new (): B }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface A { readonly new (): A }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface A { get x(): A get y(): B }", required: ["GetAccessorPossibleShape"] },
  { source: "interface A { set x(v: A) set y(v: B) }", required: ["SetAccessorPossibleShape"] },
];

// ---------------------------------------------------------------------------
// 从 typescript/cases/astjson/*.ts 读用例：与 ast-json.mjs 相同的「一行一个用例 + `\n` 编码」口径。
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
  const source = fs.readFileSync(path.join(root, "typescript", "cases", "astjson", `${stem}.ts`), "utf8");
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
  const dir = path.join(root, "typescript", "cases", "astjson");
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

/** 逐条对拍；返回 { passed, failed }，FAIL 行就打印出来。 */
function runCases(sources) {
  let passed = 0;
  let failed = 0;
  for (const source of sources) {
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
      console.log(`FAIL  ${JSON.stringify(source)}`);
      console.log(`      ${problem}`);
    }
  }
  return { passed, failed };
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
  const pickRequired = (item) => only === null || item.required.every((name) => only.includes(name));
  const genericCases = noGeneric ? [] : GENERIC_BOUNDARY_CASES.filter(pickRequired);
  const memberStartCases = noGeneric ? [] : MEMBER_START_CASES.filter(pickRequired);
  const recoveryCases = noGeneric ? [] : RECOVERY_CASES.filter(pickRequired);
  const skippedGeneric = noGeneric ? 0 : GENERIC_BOUNDARY_CASES.length - genericCases.length;
  const skippedMemberStart = noGeneric ? 0 : MEMBER_START_CASES.length - memberStartCases.length;
  const skippedRecovery = noGeneric ? 0 : RECOVERY_CASES.length - recoveryCases.length;
  let result = { passed: 0, failed: 0 };
  let genericResult = { passed: 0, failed: 0 };
  let memberStartResult = { passed: 0, failed: 0 };
  let recoveryResult = { passed: 0, failed: 0 };
  try {
    result = runCases(cases);
    genericResult = runCases(genericCases.map((item) => item.source));
    memberStartResult = runCases(memberStartCases.map((item) => item.source));
    recoveryResult = runCases(recoveryCases.map((item) => item.source));
  } finally {
    restore();
  }
  const mode = only === null ? "all" : only.join("+");
  console.log(`\n[member-possible] candidates=${mode} cases=${cases.length} pass=${result.passed} fail=${result.failed}`);
  console.log(
    `[member-possible] generic-boundary cases=${genericCases.length} pass=${genericResult.passed} fail=${genericResult.failed} skipped=${skippedGeneric}`,
  );
  console.log(
    `[member-possible] member-start cases=${memberStartCases.length} pass=${memberStartResult.passed} fail=${memberStartResult.failed} skipped=${skippedMemberStart}`,
  );
  console.log(
    `[member-possible] recovery cases=${recoveryCases.length} pass=${recoveryResult.passed} fail=${recoveryResult.failed} skipped=${skippedRecovery}`,
  );
  if (result.failed > 0 || genericResult.failed > 0 || memberStartResult.failed > 0 || recoveryResult.failed > 0) {
    process.exitCode = 1;
  }
}

main();
