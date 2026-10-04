// 覆盖矩阵：**exec（降级层 + token / 投影）** 这一层。
//
// 这一层量的是「TS 的写法能不能被读成正确的运行期语义」——类型位该**消失**、
// 有运行期语义的语法（`enum` / `namespace` / 装饰器之外的那些）该**变出对象来**、
// 语法糖该**降级成等价的控制流**。
//
// `nodeArgs` 那一栏只给**类型剥离拒收**的几条（`enum` / `namespace`：它们有运行期
// 语义，类型剥离只认「能擦掉的」语法）——裁判换成 `node --experimental-transform-types`，
// 这正是 TS 编译器会做的事。

export const execCases = [
  // ============ 类型位：一个运行期指令都不该产生 ============
  {
    id: "ex-type-annotations",
    title: "类型注解：变量 / 参数 / 返回值 / 类字段",
    src: `
let a: number = 1;
const b: string = "s";
const xs: number[] = [1, 2];
const tup: [number, string] = [1, "x"];
function f(n: number, s: string): string { return s + n; }
class C { n: number = 5; m(v: boolean): boolean { return v; } }
console.log(a, b, xs.length, tup[1], f(1, "n"), new C().n, new C().m(true));
`,
  },
  {
    id: "ex-interface",
    title: "interface：只活在类型位（用了它也不产生代码）",
    src: `
interface Point { x: number; y: number; label?: string }
interface Fn { (n: number): number }
function dist(p: Point): number { return p.x + p.y; }
const p: Point = { x: 1, y: 2 };
const f: Fn = (n) => n * 2;
console.log(dist(p), f(3), typeof p);
`,
  },
  {
    id: "ex-type-alias",
    title: "type 别名：联合 / 交叉 / 字面量 / 泛型 / 映射",
    src: `
type Id = string | number;
type Pair = { a: number } & { b: number };
type Dir = "up" | "down";
type Box<T> = { value: T };
type Keys = { [K in "x" | "y"]: number };
const id: Id = 1;
const pair: Pair = { a: 1, b: 2 };
const dir: Dir = "up";
const box: Box<string> = { value: "v" };
const keys: Keys = { x: 1, y: 2 };
console.log(id, pair.a + pair.b, dir, box.value, keys.x + keys.y);
`,
  },
  {
    id: "ex-generics",
    title: "泛型：函数 / 类 / 接口 / 约束（全部擦掉）",
    src: `
function identity<T>(v: T): T { return v; }
function first<T extends { length: number }>(xs: T[]): T { return xs[0]; }
class Box<T> {
  value: T | undefined;
  constructor(v?: T) { this.value = v; }
  get(): T | undefined { return this.value; }
}
interface Wrap<T> { item: T }
const w: Wrap<number> = { item: 3 };
console.log(identity(1), identity("s"), first([1, 2]), new Box<number>(9).get(), w.item);
`,
  },
  {
    id: "ex-abstract-class",
    title: "abstract class / abstract 成员：类型位，但子类要能覆盖",
    src: `
abstract class Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area(); }
}
class Square extends Shape {
  side: number;
  constructor(side: number) { super(); this.side = side; }
  area(): number { return this.side * this.side; }
}
console.log(new Square(3).describe(), new Square(2).area());
`,
  },
  {
    id: "ex-parameter-properties",
    title: "构造函数参数属性（`constructor(private x)`）要变出字段来",
    src: `
class P {
  constructor(public x: number, private y: number, readonly z: number = 0) {}
  sum(): number { return this.x + this.y + this.z; }
}
const p = new P(1, 2, 3);
console.log(p.x, p.sum(), Object.keys(p).length);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-declare-and-ambient",
    title: "declare 那一族：整句跳过（不产生任何东西）",
    src: `
declare const globalConst: number;
declare function ambientFn(n: number): number;
declare class Ambient { m(): void }
declare module "whatever" { }
declare namespace AmbientNs { const x: number; }
const real = 1;
console.log(real, typeof ambientFn);
`,
  },
  {
    id: "ex-overload-signatures",
    title: "函数重载：只有实现那一份产生代码",
    src: `
function pick(n: number): string;
function pick(s: string): string;
function pick(v: any): string { return typeof v === "number" ? "n" + v : "s" + v; }
console.log(pick(1), pick("a"));
`,
  },
  {
    id: "ex-nonnull-and-as",
    title: "`x!` / `as T` / `as unknown as T` / `satisfies`",
    src: `
const o: any = { a: 1 };
const n = o.a!;
const s = "1" as unknown as number;
const cfg = { level: 2 } satisfies { level: number };
console.log(n, s, cfg.level);
`,
  },
  {
    id: "ex-enum-numeric",
    title: "数值 enum：反向映射也要造出来",
    src: `
enum Color { Red, Green = 5, Blue }
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[6]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-enum-string",
    title: "字符串 enum：没有反向映射",
    src: `
enum Dir { Up = "UP", Down = "DOWN" }
console.log(Dir.Up, Dir.Down, Object.keys(Dir).join(","));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-enum-const",
    title: "const enum：内联成字面量",
    src: `
const enum Level { Low = 1, High = 2 }
console.log(Level.Low, Level.High);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-namespace",
    title: "namespace：要真的造一个对象出来（含嵌套与导出）",
    src: `
namespace Outer {
  export const a = 1;
  export function f(): number { return a + 1; }
  export namespace Inner { export const b = 2; }
  const hidden = 9;
}
console.log(Outer.a, Outer.f(), Outer.Inner.b, typeof Outer.hidden);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-decorators-on-class",
    title: "装饰器：语法要读得进来（运行期语义不在口径内）",
    src: `
function tag(target: any) { return target; }
@tag
class Service { run(): string { return "ran"; } }
console.log(new Service().run());
`,
    skip: "装饰器的运行期语义是明确不做的那一档；`node` 的类型剥离 / 变换两种模式都拒收，裁判给不出来",
  },

  // ============ 表达式形状 ============
  {
    id: "ex-template-literal",
    title: "模板字面量：插值、嵌套、多行、转义",
    src: `
const n = 2;
const s = "x";
console.log(\`n=\${n} s=\${s} sum=\${n + 1}\`);
console.log(\`nested \${[1, 2].map((v) => \`<\${v}>\`).join("")}\`);
console.log(\`line1
line2\`, \`\\\${n}\`.length);
`,
  },
  {
    id: "ex-template-multiline-indent",
    title: "模板字面量的缩进与反引号（原样保留）",
    src: `
const html = \`<ul>
  <li>a</li>
</ul>\`;
console.log(html.split("\\n").length, html.includes("  <li>"), \`back \\\` tick\`.length);
`,
  },
  {
    id: "ex-tagged-template",
    title: "标签模板：字符串表与插值分开收",
    src: `
function tag(parts: TemplateStringsArray, ...values: any[]): string {
  return parts.join("|") + "::" + values.join(",");
}
console.log(tag\`a\${1}b\${2}c\`);
console.log(tag\`plain\`);
`,
  },
  {
    id: "ex-tagged-template-suffix",
    title: "标签模板后面接成员 / 运算符 / 实参",
    src: `
const t = (s: any, ...v: any[]) => s[0] + v.join("");
console.log(t\`abc\`.length, 1 + t\`xy\`.length, t\`a\${1}b\`.toUpperCase());
`,
  },
  {
    id: "ex-optional-chain-forms",
    title: "可选链的五种落点：属性、下标、调用、串起来、在实参位",
    src: `
const o: any = { a: { b: { c: 1 } }, m: (n: number) => n, xs: [1] };
console.log(o?.a?.b?.c, o?.z?.b, o?.m?.(2), o?.n?.(2), o?.xs?.[0]);
function f(v: any): string { return "f:" + v; }
console.log(f(o?.z?.b ?? "d"), f(o?.a?.b?.c));
`,
  },
  {
    id: "ex-nullish-and-logical",
    title: "`??` / `??=` / `||=` / `&&=` 的落点：变量、成员、下标",
    src: `
let a: any = null;
a ??= 1;
const o: any = { b: 0 };
o.b ||= 2;
o.c ??= 3;
o["d"] ??= 4;
console.log(a, o.b, o.c, o.d);
`,
  },
  {
    id: "ex-new-with-type-args",
    title: "`new` 上的类型实参：`new Map<string, number>()`",
    src: `
const m = new Map<string, number>([["a", 1]]);
const xs = new Array<number>(3);
console.log(m.get("a"), xs.length, new Set<string>(["x"]).size);
`,
  },
  {
    id: "ex-class-expr-field-capture",
    title: "类表达式的**字段初始化式**要看得见外层的变量",
    src: `
function make(k: number) {
  return class { v = k; };
}
console.log(new (make(5))().v);
const outer = 7;
const C = class { w = outer; };
console.log(new C().w);
`,
  },
  {
    id: "ex-new-class-expression",
    title: "`new (class { … })()`：被 new 的是一整个类表达式",
    src: `
const v = new (class { n = 7; })();
console.log(v.n);
console.log(new (class { m() { return "m"; } })().m());
`,
  },
  {
    id: "ex-typeof-value-expression",
    title: "`typeof` 一个值表达式（不是标识符）",
    src: `
console.log(typeof ({}).toString, typeof [].length, typeof (1 + 2));
`,
  },
  {
    // **第 232 轮加的一条** ✓（**它是这一轮修好的那个形状的语料** ✓）：
    // 实参位里的 `as T`（`new Map([[1, "a"]] as any)`）在**产物那边是两格平级单元** ✓
    // （`Identifier` 与 `As` ✓，左边的操作数是它的**前一个兄弟** ✓）。
    // 逐格投会把 `As` 单独投成一个**没有 `expression`** 的 `AsExpression` ✗——
    // 实测报的是 `ast node AsExpression has no child expression` ✓
    // （一句话指向**投影** ✓，而现场是 `arguments` 那一段的**投法** ✗）。
    // **`new` 的实参位原来走的是「逐格」那条** ✗（`new.xl.md` 的 `PrintAst` ✓），
    // 而 `CallExpression` 的实参位第 143 轮就改成「按顶层逗号切段、每段走 `Expression`」了 ✓
    // ——**同一个规矩写两遍，第二遍就是漏的那一遍** ✗。
    id: "ex-as-in-new-arguments",
    title: "`new` 的实参位里带 `as`（一整个实参 = 好几格）",
    src: `
const m = new Map([[1, "a"]] as any);
console.log(m.get(1), m.size);
const s = new Set([1, 2] as any);
console.log(s.size);
function box(v: number): { v: number } { return { v }; }
console.log(new (box as any)(7).v);
`,
  },
  {
    // **第 234 轮补的语料** ✓（这一轮修的形状里**没被原来那条判据盖到**的两半 ✓）：
    // ① **带标签的循环**（`loop: for (…) { … break loop; … }` ✓）——那一半原来就是好的 ✓
    //（标签被 `EnterLoop` 吃进去 ✓），放进来是**对照** ✓；
    // ② **嵌套的标签块** ✓（`two: { … inner: { … break two; … } … }` ✓）——
    // 它逼出了「那一格必须是**一摞**」✓：一格的话 `inner` 一进就把 `two` 顶掉 ✓，
    // `break two` 报 `unknown label` ✓（而那是合法的 JS ✓）。
    // ③ **块里正常走完**那一路 ✓（`l3` 最后那个 `"w"` **不该**被跑到 ✓——
    // `break two` 在 `inner` 里就跳出去了 ✓）：第一次写「先占一条 `Jump` 当目标」时
    // 正是**这一路**错的 ✓（正常路径也跳走 ✓，**静默错值** ✓）。
    id: "ex-labeled-block-nested",
    title: "标签的另外两面：带标签的循环、嵌套的标签块",
    src: `
let l2 = "";
loop: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) break loop;
    l2 += i + "" + j;
  }
}
console.log(l2);
let l3 = "";
two: {
  l3 += "x";
  inner: {
    l3 += "y";
    if (l3.length === 2) break two;
    l3 += "z";
  }
  l3 += "w";
}
console.log(l3);
`,
  },
  {
    id: "ex-computed-member-call",
    title: "`o[k](...)` / 计算结果键的方法",
    src: `
const k = "run";
const o: any = { run(n: number) { return n + 1; }, "x-y"() { return 2; } };
console.log(o[k](1), o["x-y"](), o[k]);
const key = "dyn";
const made: any = { [key]() { return 3; } };
console.log(made.dyn());
`,
  },
  {
    id: "ex-arrow-in-arguments",
    title: "实参里写箭头 / 括号 / 逗号，边界要收得住",
    src: `
console.log([1, 2].map((v) => v * 2).join(","));
console.log([3, 1].sort((a, b) => (a < b ? -1 : 1)).join(","));
function call(f: any, x: number) { return f(x); }
console.log(call((n) => n + 1, 5), (1, 2));
`,
  },
  {
    id: "ex-ternary-nesting",
    title: "嵌套三元 / 三元当实参 / 三元里的赋值",
    src: `
function kind(n: number): string { return n === 0 ? "zero" : n > 0 ? (n > 10 ? "big" : "small") : "neg"; }
console.log(kind(0), kind(5), kind(50), kind(-1));
let hit = 0;
console.log(true ? (hit = 1, "yes") : "no", hit);
`,
  },
  {
    id: "ex-destructuring-params",
    title: "解构形参：对象 / 数组 / 默认值 / 剩余",
    src: `
function g({ a, b = 2 }: { a: number; b?: number }, [c, ...rest]: number[]): string {
  return a + "," + b + "," + c + "," + rest.join("");
}
console.log(g({ a: 1 }, [3, 4, 5]));
console.log((( { x }: any ) => x)({ x: 9 }));
`,
  },
  {
    id: "ex-spread-in-new",
    title: "带展开的构造：`new C(...xs)`",
    src: `
class P { x = 0; y = 0; constructor(x: number, y: number) { this.x = x; this.y = y; } }
const args: [number, number] = [1, 2];
console.log(new P(...args).x, new P(...[3, 4]).y);
console.log(new Map([[1, 2]] as any).get(1));
`,
  },
  {
    id: "ex-super-forms",
    title: "`super` 的三种用法：构造、方法、方法带展开",
    src: `
class A {
  n: number;
  constructor(n: number) { this.n = n; }
  m(...xs: number[]): number { return xs.length + this.n; }
}
class B extends A {
  constructor() { super(10); }
  m(...xs: number[]): number { return super.m(...xs) * 2; }
  other(): number { return super.m(1, 2, 3); }
}
const b = new B();
console.log(b.n, b.m(1, 2), b.other());
`,
  },
  {
    id: "ex-derived-default-ctor",
    title: "派生类不写构造函数：默认那条要转发实参",
    src: `
class A {
  n: number;
  constructor(n: number = 1) { this.n = n; }
}
class B extends A {}
class C extends A { constructor() { super(7); } }
console.log(new B(5).n, new C().n, new A().n);
`,
  },
  {
    id: "ex-class-field-init-order",
    title: "字段初始化顺序：基类先、自己的按声明顺序",
    src: `
const log: string[] = [];
class A { x = (log.push("A.x"), 1); constructor() { log.push("A.ctor"); } }
class B extends A { y = (log.push("B.y"), 2); constructor() { super(); log.push("B.ctor"); } }
const b = new B();
console.log(b.x, b.y, log.join(","));
`,
  },
  {
    id: "ex-private-in-operator",
    title: "私有成员：#m() / #n / static #s / #x in o",
    src: `
class C {
  #n = 1;
  static #s = 2;
  #m(): number { return this.#n + C.#s; }
  has(o: any): boolean { return #n in o; }
  value(): number { return this.#m(); }
}
const c = new C();
console.log(c.value(), c.has(c), c.has({}));
`,
  },
  {
    id: "ex-static-block-order",
    title: "静态块与静态字段的执行顺序",
    src: `
const log: string[] = [];
class C {
  static a = (log.push("a"), 1);
  static { log.push("block1"); }
  static b = (log.push("b"), 2);
  static { log.push("block2"); }
}
console.log(C.a, C.b, log.join(","));
`,
  },
  {
    id: "ex-getter-setter-class",
    title: "类里的访问器 + 继承的访问器",
    src: `
class A { get v(): number { return 1; } set v(x: number) { console.log("A set", x); } }
class B extends A { get v(): number { return super.v + 1; } }
const b = new B();
console.log(b.v);
b.v = 5;
`,
  },
  {
    id: "ex-yield-star",
    title: "`yield*` 转发（惰性转发，不是一次收完）",
    src: `
function* inner(): any { yield 1; yield 2; }
function* outer(): any { yield 0; yield* inner(); yield* [3]; }
console.log([...outer()].join(","));
`,
  },
  {
    id: "ex-labeled-block",
    title: "带标签的块：`outer: { … break outer; … }`",
    src: `
let log = "";
outer: {
  log += "a";
  if (log.length === 1) break outer;
  log += "b";
}
console.log(log);
`,
  },
  {
    id: "ex-label-on-switch",
    title: "标签挂在 switch / 循环上",
    src: `
let s = "";
outer: for (let i = 0; i < 3; i++) {
  switch (i) {
    case 1: continue outer;
    case 2: break outer;
    default: s += i;
  }
  s += "-";
}
console.log(s);
`,
  },
  {
    id: "ex-try-catch-typed",
    title: "`catch (e: unknown)` 与 catch 不用变量",
    src: `
try { throw new Error("x"); } catch (e: unknown) { console.log("typed", (e as Error).message); }
try { throw 1; } catch { console.log("bare catch"); }
`,
  },
  {
    id: "ex-try-finally-return",
    title: "`finally` 里的 return / break / continue",
    src: `
function f(): number { try { return 1; } finally { console.log("fin"); } }
console.log(f());
for (let i = 0; i < 2; i++) {
  try { if (i === 0) continue; console.log("body", i); } finally { console.log("f", i); }
}
`,
  },
  {
    id: "ex-var-and-block-scope",
    title: "`var` 提升到函数、`let` 停在块里",
    src: `
function f(): string {
  if (true) { var v = 1; let l = 2; }
  return "v=" + v;
}
console.log(f(), typeof l);
`,
  },
  {
    id: "ex-shadowing-scopes",
    title: "同名遮蔽：块 / 函数 / catch / 参数",
    src: `
let x = "global";
function f(x: string): string { { let x = "block"; return x; } }
console.log(x, f("param"), (() => { const x = "lambda"; return x; })());
try { throw "err"; } catch (x) { console.log("catch", x); }
`,
  },
  {
    id: "ex-quoted-and-keyword-keys",
    title: "字符串键 / 关键字键 / 数字键的成员名",
    src: `
const o: any = { "a-b": 1, if: 2, 3: "three", class: 4, default: 5 };
console.log(o["a-b"], o.if, o[3], o.class, o.default);
console.log(Object.keys(o).join(","));
`,
  },
  {
    id: "ex-unicode-identifiers",
    title: "非 ASCII 标识符与字符串里的非 ASCII",
    src: `
const 名字 = "中文";
const π = 3.14;
function 加法(a: number, b: number): number { return a + b; }
console.log(名字, π, 加法(1, 2), "emoji:\\u{1F600}".length);
`,
  },
  {
    id: "ex-self-referencing-decls",
    title: "声明里引用自己 / 递归类型 / 前后引用",
    src: `
type Tree = { value: number; kids: Tree[] };
const tree: Tree = { value: 1, kids: [{ value: 2, kids: [] }] };
function total(t: Tree): number { return t.value + t.kids.reduce((a, k) => a + total(k), 0); }
console.log(total(tree));
const later = () => next;
const next = 5;
console.log(later());
`,
  },
  {
    id: "ex-asi-and-comments",
    title: "分号可省、各种注释、JSDoc 夹在中间",
    src: `
// 行注释
/** JSDoc 块注释 */
const a = 1
const b = 2 /* 行内 */
/*
多行
*/
console.log(a + b)
;[1, 2].forEach((v) => { console.log("v" + v) })
`,
  },
  {
    id: "ex-module-export",
    title: "`export` 语句（单文件直接跑：导出的那一半不在口径内）",
    src: `
export const a = 1;
console.log(a);
`,
    skip: "多文件模块加载由宿主决定（README 的口径外那一条）；单文件直接跑时 export 本身无输出",
  },
  {
    id: "ex-module-import",
    title: "`import` 语句（模块解析与加载不在口径内）",
    src: `
import { readFileSync } from "node:fs";
console.log(typeof readFileSync);
`,
    skip: "模块解析 / 加载语义由宿主的装载器决定，tsrun 的口径是**单文件**",
  },
];
