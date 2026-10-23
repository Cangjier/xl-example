// body guide 管线 / 成员候选的隔离对拍工具（T3 body-foundation 新增）。
//
//   node tests/body-guide/harness.mjs                          # 默认：interface + 只留 PropertySignaturePossibleShape
//   node tests/body-guide/harness.mjs --all                    # interface 不裁剪候选（7 候选全量）
//   node tests/body-guide/harness.mjs --only=PropertySignaturePossibleShape
//   node tests/body-guide/harness.mjs --only=PropertySignaturePossibleShape,MethodSignaturePossibleShape
//   node tests/body-guide/harness.mjs --from-cases             # 从 typescript/cases/*.ts 自动挑「只含属性签名接口」的用例
//   node tests/body-guide/harness.mjs --file=cases.json        # JSON 字符串数组，逐个源码
//   node tests/body-guide/harness.mjs --no-generic             # 跳过 generic-boundary / member-start / recovery 三组
//   node tests/body-guide/harness.mjs --no-util                # 跳过 BodyGuideUtil 冒烟组
//   node tests/body-guide/harness.mjs --target=interface|enum|class|all
//   node tests/body-guide/harness.mjs --verbose
//
// 对拍口径与 ast-json.mjs / ast-json-diff.mjs 完全一致：TS 侧 ts.createSourceFile + ast-compare.tsAst，
// 本仓侧 SourceFileRunner.Parse + ast-compare.cjAst，逐节点比较 kind / pos / end / text / name。
//
// 隔离办法是**运行时 monkeypatch** 目标 shape 的静态成员目录缓存
// （xl 生成的 JS 里 private static 字段在运行期可写），不改任何源码；进程退出即还原。
// interface 的裁剪点沿用 tests/member-possible/harness.mjs 的 `InterfaceDeclarationShape.CreateBodyPossibleShapesCache`；
// enum / class 的同类裁剪点在 BODY_TARGETS 里**按名字预留**，T5/T6 把本族的 shape 与候选落地后自动生效
// （当前分支没有它们的 body 候选目录，显式请求会报 SKIPPED，不算通过）。
//
// 分组（与 member-possible 一致）：
//   cases          默认成员边界用例
//   generic-boundary 成员自身 `<...>` 里的 `>` / `,` 不能提前收口
//   member-start   成员起点判据（`get?` / 成员名与 `<` `(` 之间不插 ASI / `typeof import`）
//   recovery       非法源码（同行缺分隔符）必须回落 raw、不抛异常
//   util           BodyGuideUtil 冒烟：7 个静态方法存在 + CreateShapesCache「空则建、非空复用」
// `--no-generic` 同时跳过 generic-boundary / member-start / recovery 三组。
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

// ---------------------------------------------------------------------------
// 裁剪点登记表：target 名 → 本族声明 shape 的模块 / 静态成员目录缓存字段 / 候选类名 → 生成物路径。
// 新增一族（T5 enum / T6 class）时只改这张表 + 补用例，不改 harness 逻辑。
const BODY_TARGETS = {
  interface: {
    shapeName: "InterfaceDeclarationShape",
    modulePath: "typescript/tokens/declarations/interface-declaration-shape.js",
    cacheField: "CreateBodyPossibleShapesCache",
    candidates: {
      PropertySignaturePossibleShape: "typescript/tokens/types/property-signature-possible-shape.js",
      MethodSignaturePossibleShape: "typescript/tokens/types/method-signature-possible-shape.js",
      IndexSignaturePossibleShape: "typescript/tokens/types/index-signature-possible-shape.js",
      CallSignaturePossibleShape: "typescript/tokens/types/call-signature-possible-shape.js",
      ConstructSignaturePossibleShape: "typescript/tokens/types/construct-signature-possible-shape.js",
      GetAccessorPossibleShape: "typescript/tokens/types/get-accessor-possible-shape.js",
      SetAccessorPossibleShape: "typescript/tokens/types/set-accessor-possible-shape.js",
    },
    // 用例分组随 target 走：interface 复用 member-possible 的同一套用例。
    cases: () => DEFAULT_CASES,
    genericBoundary: () => GENERIC_BOUNDARY_CASES,
    memberStart: () => MEMBER_START_CASES,
    recovery: () => RECOVERY_CASES,
  },
  // 预留：T5 给 EnumDeclarationShape 增加 CreateBodyPossibleShapesCache / CreateBodyPossibleShapes 后自动生效。
  enum: {
    shapeName: "EnumDeclarationShape",
    modulePath: "typescript/tokens/declarations/enum-declaration-shape.js",
    cacheField: "CreateBodyPossibleShapesCache",
    candidates: {
      EnumMemberPossibleShape: "typescript/tokens/members/enum-member-possible-shape.js",
    },
    cases: () => [],
    genericBoundary: () => [],
    memberStart: () => [],
    recovery: () => [],
  },
  // T6b：类体成员候选（属性 / 方法 / 兜底）。兜底候选永远留在目录里（pinned），
  // 否则 `--only=` 裁剪后遇到构造 / 访问器 / static 块会让 CatalogGuide 0 候选抛错。
  class: {
    shapeName: "ClassDeclarationShape",
    modulePath: "typescript/tokens/declarations/class-declaration-shape.js",
    cacheField: "CreateBodyPossibleShapesCache",
    candidates: {
      PropertyDeclarationPossibleShape: "typescript/tokens/types/property-declaration-possible-shape.js",
      MethodDeclarationPossibleShape: "typescript/tokens/types/method-declaration-possible-shape.js",
      ConstructorPossibleShape: "typescript/tokens/types/constructor-possible-shape.js",
      GetAccessorPossibleShape: "typescript/tokens/types/class-get-accessor-possible-shape.js",
      SetAccessorPossibleShape: "typescript/tokens/types/class-set-accessor-possible-shape.js",
      ClassStaticBlockDeclarationPossibleShape: "typescript/tokens/types/class-static-block-declaration-possible-shape.js",
      IndexSignaturePossibleShape: "typescript/tokens/types/class-index-signature-possible-shape.js",
      SemicolonClassElementPossibleShape: "typescript/tokens/expressions/semicolon-class-element-possible-shape.js",
      ClassMemberCatchAllPossibleShape: "typescript/tokens/types/class-member-catch-all-possible-shape.js",
    },
    pinned: ["ClassMemberCatchAllPossibleShape"],
    cases: () => CLASS_CASES,
    genericBoundary: () => CLASS_GENERIC_BOUNDARY_CASES,
    memberStart: () => CLASS_MEMBER_START_CASES,
    recovery: () => CLASS_RECOVERY_CASES,
  },
};

// ---------------------------------------------------------------------------
// class body 用例：属性 / 方法 / 构造 / 访问器 / static 块 / `;` / 索引签名 / 装饰器 /
// 计算名 / 字符串名 / 数字名 / `#private` / 无分号换行 / 同一行多条 / 泛型。
// 增量路径只建属性与方法，其余走兜底 raw 尾巴——两条路径都必须与 TS AST 逐节点一致。
const CLASS_CASES = [
  "class C {}",
  "class C { a = 1; }",
  "class C { a: number; }",
  "class C { readonly a: A; }",
  "class C { static readonly a = 1 }",
  "class C { a?: A }",
  "class C { a!: A }",
  "class C { a: A = 1 }",
  "class C { a = 1\n b = 2 }",
  "class C { a = 1; b = 2 }",
  "class C { a = 1/* c */\n b = 2 }",
  "class C { \"x\" = 1 }",
  "class C { 0 = 1 }",
  "class C { #x = 1 }",
  "class C { [k] = 1 }",
  "class C { [Symbol.iterator]: () => void }",
  "class C { m() {} }",
  "class C { m(): void; }",
  "class C { m(a: A): B { return a; } }",
  "class C { m<T>(x: T): T { return x; } }",
  "class C { async m() {} }",
  "class C { *m() {} }",
  "class C { m?(): void }",
  "class C { get x() { return 1; } }",
  "class C { set x(v) {} }",
  "class C { constructor() {} }",
  "class C { constructor(private a: A) {} }",
  "class C { static { let x = 1; } }",
  "class C { ; }",
  "class C { a = 1;; }",
  "class C { a: A\n m(): void }",
  "class C { m(): void\n n(): void }",
  "class C { abstract m(): void }",
  "class C { @dec m() {} }",
  "class C { a = { x: 1 } }",
  "class C { a: { x: 1 } }",
  "class C { a: Map<string, number> }",
  "class C { a: A<B<C>> }",
  "class C { a = () => { return 1; } }",
  "class C { public static readonly a = 1; private b: B; protected c() {} }",
  "class C { a\n b }",
  "class C { a = 1\n [b] = 2 }",
  "class C extends B { a = 1 }",
  "class C<T> extends B<T> implements I { m(): T { return null; } }",
  // 分界证据落在修饰词上的回归（T6b：FindMemberBoundary 会在 readonly 处给出边界，
  // 但那仍是一条成员的修饰词链，不能把 `public static` 切出来重跑 BuildMembers）。
  "class C { public static \nreadonly a = 1; private m() { } }",
  "class C { public static //c\nreadonly a = 1; private m() { } }",
];

const CLASS_GENERIC_BOUNDARY_CASES = [
  { source: "class C { a: Map<string, number> }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a: A<B<C>> }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a: A<B> | C }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a: (x: A) => B }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { m<T, U>(x: T): U { return x; } }", required: ["MethodDeclarationPossibleShape"] },
  { source: "class C { m<T extends A<B>>() {} }", required: ["MethodDeclarationPossibleShape"] },
];

const CLASS_MEMBER_START_CASES = [
  { source: "class C { a = 1\n b = 2 }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a = 1; b = 2; c = 3 }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { m(): void\n n(): void }", required: ["MethodDeclarationPossibleShape"] },
  { source: "class C { a: A\n [B]: C }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a: A\n m() {} }", required: ["PropertyDeclarationPossibleShape", "MethodDeclarationPossibleShape"] },
  { source: "class C { m() {}\n a = 1 }", required: ["PropertyDeclarationPossibleShape", "MethodDeclarationPossibleShape"] },
  { source: "class C { constructor() {}\n a = 1 }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { a = 1\n constructor() {} }", required: ["PropertyDeclarationPossibleShape"] },
  { source: "class C { constructor() {}\n constructor(a: A) {} }", required: ["ConstructorPossibleShape"] },
  { source: "class C { constructor(private a: A) {}\n m() {} }", required: ["ConstructorPossibleShape"] },
  { source: "class C { get x() { return 1; }\n set x(v) {} }", required: ["GetAccessorPossibleShape", "SetAccessorPossibleShape"] },
  { source: "class C { static get [k](): number { return 1; } }", required: ["GetAccessorPossibleShape"] },
  { source: "class C { static set [k](v: number) {} }", required: ["SetAccessorPossibleShape"] },
  { source: "class C { static { let x = 1; }\n static { } }", required: ["ClassStaticBlockDeclarationPossibleShape"] },
  { source: "class C { static {}\n a = 1 }", required: ["ClassStaticBlockDeclarationPossibleShape"] },
  { source: "class C { readonly [k: string]: A;\n [j: number]: B }", required: ["IndexSignaturePossibleShape"] },
  { source: "class C { [k: string]: A\n m() {} }", required: ["IndexSignaturePossibleShape"] },
];

const CLASS_RECOVERY_CASES = [];

/** BodyGuideUtil 的静态方法清单（冒烟组断言用；与设计文档 §6.2 的接口一一对应）。 */
const BODY_GUIDE_UTIL_METHODS = [
  "BasePos",
  "IsBodyBracket",
  "MountBodyGuide",
  "MountShell",
  "CollectBodyMembers",
  "FinishShell",
  "CreateShapesCache",
];

const UTIL_MODULE_PATH = "typescript/tokens/declarations/body-guide-util.js";

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");
const fromCases = argv.includes("--from-cases");
const runAll = argv.includes("--all");
const noGeneric = argv.includes("--no-generic");
const noUtil = argv.includes("--no-util");
const onlyArg = argv.find((item) => item.startsWith("--only="));
const fileArg = argv.find((item) => item.startsWith("--file="));
const targetArg = argv.find((item) => item.startsWith("--target="));

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

/** 泛型成员边界回归：成员自身 `<...>` 里的 `>` / `,` 不能提前收口。 */
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
  { source: "interface I { (): A\n(): B }", required: ["CallSignaturePossibleShape"] },
  { source: "interface I { <T>(x: T): A\n(): B }", required: ["CallSignaturePossibleShape"] },
  { source: "interface I { a: A\n(): B }", required: ["PropertySignaturePossibleShape", "CallSignaturePossibleShape"] },
];

/** `member-start` 分组：`get?` / `set?` 判名字族 + 成员名与 `<` `(` 之间换行不插 ASI。 */
const MEMBER_START_CASES = [
  { source: "interface I { get?(): any; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { get?(this: This): Value; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { set?(v: string): void; }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
  { source: "interface I { get?<T>(): T }", required: ["MethodSignaturePossibleShape"] },
  { source: "interface I { get?: A }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { get?: (a: A) => B }", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { set?: (v: A) => void }", required: ["PropertySignaturePossibleShape"] },
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
  { source: "interface I { f: typeof import\n(\"m\") }", required: ["PropertySignaturePossibleShape"] },
  { source: "type B = { f: typeof import\n(\"m\") };", required: ["PropertySignaturePossibleShape"] },
  { source: "interface I { a: A\n(): B }", required: ["PropertySignaturePossibleShape", "CallSignaturePossibleShape"] },
  { source: "interface I { [k: string]: A\n(): B }", required: ["IndexSignaturePossibleShape"] },
  { source: "interface I { a: A\nnew (): B }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface I { readonly\n[Symbol.iterator](): T }", required: ["PropertySignaturePossibleShape", "MethodSignaturePossibleShape"] },
];

/** `recovery` 分组：非法源码（同行缺分隔符）必须回落 raw、不抛异常。 */
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
  { source: "interface A { (): void (): string }", required: ["CallSignaturePossibleShape"] },
  { source: "interface A { <T>(x: T): U <U>(y: U): V }", required: ["CallSignaturePossibleShape"] },
  { source: "interface A { new (): A new (): B }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface A { readonly new (): A }", required: ["ConstructSignaturePossibleShape"] },
  { source: "interface A { get x(): A get y(): B }", required: ["GetAccessorPossibleShape"] },
  { source: "interface A { set x(v: A) set y(v: B) }", required: ["SetAccessorPossibleShape"] },
];

// ---------------------------------------------------------------------------
// 从 typescript/cases/*.ts 读用例：与 ast-json.mjs 相同的「一行一个用例 + `\n` 编码」口径。
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
    return BODY_TARGETS.interface.cases();
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

/** 加载 target 的声明 shape，并探测它有没有 body 候选目录（静态缓存字段）。 */
function resolveTarget(name) {
  const spec = BODY_TARGETS[name];
  const moduleFile = path.join(root, "build/ts", spec.modulePath);
  let ShapeClass = null;
  try {
    ShapeClass = require(moduleFile)[spec.shapeName];
  } catch (error) {
    return { name, spec, ok: false, reason: `生成物不可用：${path.relative(root, moduleFile)}（${error.code ?? error.message}）` };
  }
  if (ShapeClass === undefined) {
    return { name, spec, ok: false, reason: `生成物里没有导出 ${spec.shapeName}` };
  }
  if (!Object.prototype.hasOwnProperty.call(ShapeClass, spec.cacheField)) {
    return {
      name,
      spec,
      ok: false,
      reason: `本分支的 ${spec.shapeName} 还没有 ${spec.cacheField}（body guide 尚未落地；该 target 是结构预留）`,
    };
  }
  return { name, spec, ok: true, ShapeClass };
}

/** 按需裁剪 target 的成员候选目录；返回还原函数。only === null 表示不裁剪。 */
function installCandidates(target, only) {
  const ShapeClass = target.ShapeClass;
  const cacheField = target.spec.cacheField;
  const original = ShapeClass[cacheField];
  if (only === null) {
    return () => { ShapeClass[cacheField] = original; };
  }
  const shapes = [];
  for (const name of only) {
    const modulePath = target.spec.candidates[name];
    if (modulePath === undefined) {
      throw new Error(`target=${target.name} 未知候选：${name}；可用：${Object.keys(target.spec.candidates).join(", ") || "（本族还没有候选）"}`);
    }
    const loaded = require(path.join(root, "build/ts", modulePath));
    const ShapeClassOfCandidate = loaded[name];
    if (ShapeClassOfCandidate === undefined) {
      throw new Error(`生成物里没有导出 ${name}：${path.join(root, "build/ts", modulePath)}`);
    }
    shapes.push(new ShapeClassOfCandidate());
  }
  // pinned：裁剪时始终保留的候选（class 的兜底候选；见 BODY_TARGETS.class.pinned）。
  const pinned = target.spec.pinned ?? [];
  for (const name of pinned) {
    if (only.includes(name)) {
      continue;
    }
    const modulePath = target.spec.candidates[name];
    if (modulePath === undefined) {
      throw new Error(`target=${target.name} pinned 未知候选：${name}`);
    }
    const loaded = require(path.join(root, "build/ts", modulePath));
    shapes.push(new loaded[name]());
  }
  ShapeClass[cacheField] = shapes;
  return () => { ShapeClass[cacheField] = original; };
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

// ---------------------------------------------------------------------------
// `util` 分组：BodyGuideUtil 冒烟（不需要 token 机制，纯静态方法语义）。
function runUtilChecks() {
  let passed = 0;
  let failed = 0;
  const check = (label, ok, detail) => {
    if (ok) {
      passed++;
      if (verbose) {
        console.log(`PASS  util:${label}`);
      }
    } else {
      failed++;
      console.log(`FAIL  util:${label}`);
      if (detail !== undefined) {
        console.log(`      ${detail}`);
      }
    }
  };
  let util = null;
  try {
    util = require(path.join(root, "build/ts", UTIL_MODULE_PATH)).BodyGuideUtil;
  } catch (error) {
    check("load", false, `生成物不可用：build/ts/${UTIL_MODULE_PATH}（${error.code ?? error.message}）`);
    return { passed, failed };
  }
  check("class", util !== undefined && typeof util === "function");
  if (util === undefined) {
    return { passed, failed };
  }
  for (const method of BODY_GUIDE_UTIL_METHODS) {
    check(`method:${method}`, typeof util[method] === "function");
  }
  // CreateShapesCache：缓存为空时调工厂一次并返回它的结果；非空时原样复用、不再调工厂。
  let factoryCalls = 0;
  const created = util.CreateShapesCache(null, () => {
    factoryCalls++;
    return [{ kind: "created" }];
  });
  check("CreateShapesCache:create", factoryCalls === 1 && Array.isArray(created) && created[0].kind === "created");
  let reusedFactoryCalls = 0;
  const reused = util.CreateShapesCache(created, () => {
    reusedFactoryCalls++;
    return [{ kind: "rebuilt" }];
  });
  check(
    "CreateShapesCache:reuse",
    reused === created && reusedFactoryCalls === 0,
    `reused=${reused === created} factoryCalls=${reusedFactoryCalls}`,
  );
  return { passed, failed };
}

function runTarget(name) {
  const target = resolveTarget(name);
  if (!target.ok) {
    return { name, available: false, reason: target.reason };
  }
  const noTargetCases = target.spec.cases().length === 0
    && target.spec.genericBoundary().length === 0
    && target.spec.memberStart().length === 0
    && target.spec.recovery().length === 0;
  if (noTargetCases) {
    return { name, available: false, reason: `target=${name} 还没有登记用例（T5/T6 补充后自动生效）` };
  }
  let only = [Object.keys(target.spec.candidates)[0]];
  if (runAll) {
    only = null;
  } else if (onlyArg !== undefined) {
    only = onlyArg.slice("--only=".length).split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  }
  const restore = installCandidates(target, only);
  const cases = name === "interface" ? collectCases() : target.spec.cases();
  const pickRequired = (item) => only === null || item.required.every((candidate) => only.includes(candidate));
  const genericCases = noGeneric ? [] : target.spec.genericBoundary().filter(pickRequired);
  const memberStartCases = noGeneric ? [] : target.spec.memberStart().filter(pickRequired);
  const recoveryCases = noGeneric ? [] : target.spec.recovery().filter(pickRequired);
  const skippedGeneric = noGeneric ? 0 : target.spec.genericBoundary().length - genericCases.length;
  const skippedMemberStart = noGeneric ? 0 : target.spec.memberStart().length - memberStartCases.length;
  const skippedRecovery = noGeneric ? 0 : target.spec.recovery().length - recoveryCases.length;
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
  console.log(`\n[body-guide] target=${name} candidates=${mode} cases=${cases.length} pass=${result.passed} fail=${result.failed}`);
  console.log(
    `[body-guide] target=${name} generic-boundary cases=${genericCases.length} pass=${genericResult.passed} fail=${genericResult.failed} skipped=${skippedGeneric}`,
  );
  console.log(
    `[body-guide] target=${name} member-start cases=${memberStartCases.length} pass=${memberStartResult.passed} fail=${memberStartResult.failed} skipped=${skippedMemberStart}`,
  );
  console.log(
    `[body-guide] target=${name} recovery cases=${recoveryCases.length} pass=${recoveryResult.passed} fail=${recoveryResult.failed} skipped=${skippedRecovery}`,
  );
  return {
    name,
    available: true,
    failed: result.failed + genericResult.failed + memberStartResult.failed + recoveryResult.failed,
  };
}

function main() {
  let targets = ["interface"];
  if (targetArg !== undefined) {
    const requested = targetArg.slice("--target=".length).split(",").map((item) => item.trim()).filter((item) => item.length > 0);
    if (requested.includes("all")) {
      targets = Object.keys(BODY_TARGETS);
    } else {
      for (const name of requested) {
        if (BODY_TARGETS[name] === undefined) {
          console.log(`[body-guide] 未知 target：${name}；可用：${Object.keys(BODY_TARGETS).join(", ")}, all`);
          process.exitCode = 1;
          return;
        }
      }
      targets = requested;
    }
  }
  let failed = 0;
  let ran = 0;
  for (const name of targets) {
    const result = runTarget(name);
    if (!result.available) {
      console.log(`[body-guide] target=${name} SKIPPED: ${result.reason}`);
      continue;
    }
    ran++;
    failed += result.failed;
  }
  if (!noUtil) {
    const utilResult = runUtilChecks();
    console.log(`\n[body-guide] util cases=${utilResult.passed + utilResult.failed} pass=${utilResult.passed} fail=${utilResult.failed}`);
    failed += utilResult.failed;
  }
  if (ran === 0) {
    console.log("[body-guide] 没有可运行的 target；请用 --target=interface 或等待 T5/T6 落地");
  }
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
