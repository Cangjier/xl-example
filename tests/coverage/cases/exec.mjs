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

  // ============ 第 273 轮加宽（33 条）：TS 形状里「普通 `.ts` 常见」的那些写法 ============
  //
  // 与 `runtime.mjs` 那一批同一条普查口径 ✓：只留裁判跑得动的 ✓。
  // **`nodeArgs` 有两处** ✗：`enum` / 构造函数参数属性要变换（类型剥离拒收 ✓），
  // 以及**尖括号断言** `<T>expr` ✓——`node` 的剥离模式明确拒收它 ✓
  //（「与 JSX 有歧义」✓），所以要 `--experimental-transform-types` 才有一个裁判 ✓。
  {
    id: "ex-class-member-modifiers",
    title: "成员修饰词全上：public / private / protected / readonly / static / override",
    src: `
class A {
  public a = 1;
  private b = 2;
  protected c = 3;
  readonly d = 4;
  static s = 5;
  sum(): number { return this.a + this.b + this.c + this.d + A.s; }
}
class B extends A {
  override sum(): number { return super.sum() * 10; }
  static s = 50;
}
console.log(new A().sum(), new B().sum(), B.s, A.s);
`,
  },
  {
    id: "ex-implements-and-heritage",
    title: "implements 多个接口 + 接口继承",
    src: `
interface Named { name: string }
interface Aged { age: number }
interface Employee extends Named, Aged { id: number }
class Person implements Named, Aged {
  constructor(public name: string, public age: number) {}
}
const e: Employee = { name: "k", age: 1, id: 2 };
const p = new Person("a", 3);
console.log(p.name, p.age, e.id, e.name);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-index-and-call-signatures",
    title: "索引签名 + 调用签名 + 构造签名（都是类型位）",
    src: `
interface Dict { [k: string]: number }
interface Fn { (a: number): number; tag: string }
interface Ctor { new (n: number): { n: number } }
const d: Dict = { a: 1, b: 2 };
const f: Fn = Object.assign((n: number) => n + 1, { tag: "t" });
const C: Ctor = class { n: number; constructor(n: number) { this.n = n; } };
console.log(d.a + d["b"], f(1), f.tag, new C(4).n);
`,
  },
  {
    id: "ex-angle-bracket-assertion",
    title: "尖括号断言 `<T>expr`（与 `as` 同一个意思）",
    src: `
const v: any = "abc";
console.log((<string>v).length, (<number>(<any>1)) + 1);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-never-unknown-void-any",
    title: "never / unknown / void / any 四个特殊类型",
    src: `
function fail(msg: string): never { throw new Error(msg); }
function logIt(v: unknown): void { console.log("v", v); }
const a: any = 1;
logIt(a);
logIt(undefined);
console.log(typeof fail, a, typeof logIt);
try { fail("boom"); } catch (e) { console.log((e as Error).message); }
`,
  },
  {
    id: "ex-as-const",
    title: "`as const`：字面量数组/对象照常跑",
    src: `
const dirs = ["up", "down"] as const;
const cfg = { level: 2, name: "x" } as const;
console.log(dirs[0], dirs.length, dirs.join(","), cfg.level, cfg.name);
`,
  },
  {
    id: "ex-readonly-arrays-tuples",
    title: "readonly 数组 / 元组 / 具名元组成员 / 变长元素",
    src: `
const xs: readonly number[] = [1, 2, 3];
const t: readonly [number, string] = [1, "a"];
const tup: [a: number, b?: string, ...rest: number[]] = [1, "z", 3, 4];
console.log(xs.length, t[1], tup[0], tup[2], xs.reduce((a, b) => a + b, 0));
`,
  },
  {
    id: "ex-type-predicate-and-assertion",
    title: "类型谓词 `v is T` 与断言函数 `asserts v`",
    src: `
function isString(v: unknown): v is string { return typeof v === "string"; }
function assert(v: unknown): asserts v { if (!v) throw new Error("no"); }
const xs: unknown[] = [1, "a", true, "b"];
console.log(xs.filter(isString).length, xs.filter(isString).join(""));
assert(1);
console.log("asserted");
`,
  },
  {
    id: "ex-this-parameter",
    title: "`this` 形参（类型位，但调用要真的换 this）",
    src: `
function read(this: { n: number }, k: number): number { return this.n + k; }
const box = { n: 10 };
console.log(read.call(box, 1));
console.log(read.apply(box, [2]));
`,
  },
  {
    id: "ex-generic-constraints-defaults",
    title: "泛型约束 + 默认类型参数 + 多参数",
    src: `
function pick<T, K extends keyof T = keyof T>(o: T, k: K): T[K] { return o[k]; }
class Pair<A, B = A> { constructor(public first: A, public second: B) {} }
console.log(pick({ a: 1, b: "s" }, "a"), new Pair(1, "x").second, new Pair(2, 3).first);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-keyof-typeof-types",
    title: "`keyof` / `typeof` 在类型位，`in` 作类型映射",
    src: `
const cfg = { a: 1, b: "s" };
type Cfg = typeof cfg;
type K = keyof Cfg;
type Mapped = { [P in K]: Cfg[P] };
const m: Mapped = { a: 2, b: "t" };
console.log(m.a, m.b, Object.keys(m).join(","));
`,
  },
  {
    id: "ex-conditional-mapped-types",
    title: "条件类型 + 映射类型 + 模板字面量类型（只在类型位）",
    src: `
type IsString<T> = T extends string ? "yes" : "no";
type Wrap<T> = { [K in keyof T]: T[K] };
type Event = \`on\${"Click" | "Hover"}\`;
type A = IsString<string>;
type B = IsString<number>;
const w: Wrap<{ n: number }> = { n: 1 };
const ev: Event = "onClick";
console.log(w.n, ev, 1 as any satisfies number);
`,
  },
  {
    id: "ex-enum-in-switch",
    title: "enum 当 switch 的分派键（**函数体里**用枚举名）",
    src: `
enum Kind { A = "a", B = "b", C = "c" }
function weight(k: Kind): number {
  switch (k) {
    case Kind.A: return 1;
    case Kind.B: return 2;
    case Kind.C: return 3;
    default: return 0;
  }
}
console.log(weight(Kind.A), weight(Kind.B), weight(Kind.C), Kind.B);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-enum-computed-initializer",
    title: "enum 成员的初始化式是算出来的（反向映射那一格）",
    src: `
const BASE = 10;
enum E { A = BASE, B = BASE * 2, C = 1 + 1 }
console.log(E.A, E.B, E.C, E[10], E[20], E[2]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-delete-optional-chain",
    title: "`delete` 落在可选链与计算键上",
    src: `
const o: any = { a: { b: 1 }, c: 2 };
console.log(delete o?.a?.b, o.a.b);
console.log(delete o?.zzz, delete o["c"], Object.keys(o).join(","));
`,
  },
  {
    id: "ex-object-literal-accessors",
    title: "对象字面量里的 get / set（含计算键）",
    src: `
let stored = 0;
const key = "v";
const o: any = {
  get v() { return stored; },
  set v(x: number) { stored = x * 2; },
  get [key + "2"]() { return stored + 1000; },
  n: 1,
};
o.v = 5;
console.log(o.v, o.v2, o.n, Object.keys(o).join(","));
`,
  },
  {
    id: "ex-arrow-returning-object",
    title: "箭头函数直接返回对象字面量 / 再套一层箭头",
    src: `
const make = (n: number) => ({ n, id: "x" + n });
const nested = () => () => ({ a: 1 });
const withBody = (n: number) => { return { n }; };
console.log(make(1).n, make(2).id, nested()().a, withBody(3).n);
`,
  },
  {
    id: "ex-class-expression-extends",
    title: "类表达式继承 + 用 `super` + instanceof",
    src: `
class Base { m(): string { return "base"; } }
const Sub = class extends Base { m(): string { return "sub:" + super.m(); } };
const Named = class Self extends Base { m(): string { return "named"; } };
const s = new Sub();
console.log(s.m(), s instanceof Base, new Named().m());
`,
  },
  {
    id: "ex-computed-class-members",
    title: "类里的计算成员名：方法 / 访问器 / 静态",
    src: `
const m = "run";
const g = "val";
class C {
  [m](): number { return 1; }
  get [g](): number { return 2; }
  static ["make"](): string { return "s"; }
}
console.log(new C().run(), (new C() as any).val, C.make(), Object.getOwnPropertyNames(C.prototype).join(","));
`,
  },
  {
    id: "ex-function-decl-in-block",
    title: "块里的函数声明：块内可见、块外不泄漏",
    src: `
if (true) { function f(): string { return "in if"; } console.log(f()); }
function outer(): string { { function g(): string { return "in block"; } return g(); } }
console.log(outer(), typeof f);
`,
  },
  {
    id: "ex-switch-no-default",
    title: "switch 没有 default / 只有 default / 空体",
    src: `
function f(n: number): string {
  let out = "";
  switch (n) {
    case 1: out += "one";
    case 2: out += "two"; break;
    case 3: out += "three";
  }
  return out === "" ? "none" : out;
}
function g(n: number): string { switch (n) { default: return "d"; } }
function h(): string { switch (1) { } return "empty"; }
console.log(f(1), f(2), f(3), f(9), g(1), h());
`,
  },
  {
    id: "ex-try-only-finally",
    title: "只有 finally 的 try（没有 catch）",
    src: `
function f(): number {
  let n = 0;
  try { n = 1; } finally { n += 10; }
  return n;
}
function g(): string {
  try { return "early"; } finally { console.log("g finally"); }
}
console.log(f(), g());
`,
  },
  {
    id: "ex-string-raw-and-tagged",
    title: "`String.raw` 与标签模板的 `raw` 那一栏",
    src: `
function tag(parts: any): string { return parts.raw[0] + "|" + parts[0]; }
console.log(String.raw\`a\\nb\`.length, "a\\nb".length);
console.log(tag\`c\\td\`);
console.log(String.raw\`x\${1}y\`);
`,
  },
  {
    id: "ex-in-operator-narrowing",
    title: "`in` 当类型守卫（值位照常跑）",
    src: `
type A = { kind: "a"; x: number };
type B = { kind: "b"; y: string };
function f(v: A | B): string { return "x" in v ? "x=" + v.x : "y=" + v.y; }
console.log(f({ kind: "a", x: 1 }), f({ kind: "b", y: "s" }));
console.log("x" in { x: 1 }, "toString" in {});
`,
  },
  {
    id: "ex-interface-merging",
    title: "同名 interface 合并（纯类型位，合并后形状要能用）",
    src: `
interface I { a: number }
interface I { b: string }
interface J extends I { c: boolean }
const v: J = { a: 1, b: "s", c: true };
console.log(v.a, v.b, v.c);
`,
  },
  {
    id: "ex-class-field-definite-and-optional",
    title: "`n!: number` 与 `m?: string` 两种字段声明",
    src: `
class C {
  n!: number;
  m?: string;
  o: number = 0;
  init(): void { this.n = 1; }
}
const c = new C();
c.init();
console.log(c.n, c.m, c.o, "m" in c, JSON.stringify(c));
`,
  },
  {
    id: "ex-abstract-implements",
    title: "abstract class 被 implements / 抽象成员被子类实现",
    src: `
interface Shape { area(): number }
abstract class Base implements Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area().toFixed(1); }
}
class Sq extends Base { constructor(private s: number) { super(); } area(): number { return this.s * this.s; } }
console.log(new Sq(3).describe());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-optional-params-and-rest",
    title: "可选形参 + 剩余形参 + 实参少于形参",
    src: `
function f(a: number, b?: number, ...rest: number[]): string {
  return [a, b, rest.length, rest.join("")].join("/");
}
console.log(f(1), f(1, 2), f(1, 2, 3, 4), f(1, undefined, 5));
const g = (x: number, y = 10) => x + y;
console.log(g(1), g(1, 2), g(1, undefined));
`,
  },
  {
    id: "ex-tagged-template-suffix-forms",
    title: "标签模板后面接的属性 / 下标 / 调用",
    src: `
const tag = (s: any, ...v: any[]) => ({ text: s.join("|") + v.join(""), len: s[0].length });
const r: any = tag\`ab\${1}c\`;
console.log(r.text, r.len);
const arr = [tag\`x\`, tag\`y\`];
console.log(arr.length, arr[1].text);
function wrap(f: any): any { return f\`p\`; }
console.log(wrap(tag).text);
`,
  },
  {
    id: "ex-nested-namespace-type-only",
    title: "namespace 只用类型位的那一半（`export type` / `export interface`）",
    src: `
namespace Types {
  export type Id = string | number;
  export interface Box { v: number }
}
const id: Types.Id = 1;
const b: Types.Box = { v: 2 };
console.log(id, b.v);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-modifier-argument-expressions",
    title: "实参位里的各种表达式：三元 / 逻辑 / 展开 / 逗号",
    src: `
function f(...xs: any[]): string { return xs.join("|"); }
const flags = [1, 2];
console.log(f(true ? "t" : "f", null ?? "n", 0 || "o", ...flags, (1, 2)));
console.log(f([1, 2].length, { a: 1 }.a, typeof 1));
`,
  },
  {
    id: "ex-class-field-init-this-and-arrow",
    title: "字段初始化式里用 `this` 与箭头函数捕获 `this`",
    src: `
class C {
  n = 5;
  doubled = this.n * 2;
  arrow = () => this.n + 1;
  m(): number { return this.arrow(); }
}
const c = new C();
console.log(c.doubled, c.arrow(), c.m(), c.n);
const detached = c.arrow;
console.log(detached());
`,
  },
  {
    id: "ex-getter-setter-inheritance-chain",
    title: "三层继承里的访问器与 `super` 链",
    src: `
class A { get v(): number { return 1; } }
class B extends A { get v(): number { return super.v + 10; } }
class C extends B { get v(): number { return super.v + 100; } }
console.log(new A().v, new B().v, new C().v);
`,
  },
  // **第 282 轮加宽（1 条）** ✓：这一条钉的是那一轮修好的形状 ✓——
  // 枚举名在**内层作用域**里也要看得见 ✓（原来只有顶层看得见 ✓，
  // 因为「这一层声明了哪些名字」那张名单漏了 `EnumDeclaration` ✓）。
  // **四种内层各来一个** ✗（函数 / 箭头 / 立即调用 / 类方法 ✓）：
  // 它们走的是同一条「内层看外层」的路 ✓，而那条路要**先认出这是捕获** ✓——
  // 名单里没有它，这个引用就**哪儿都不属于** ✓（报 `name is not a local or a capture` ✓）。
  // **反向映射也放进来** ✓（`N[1]` 给 `"A"` ✓）：它证明进环境格的是**真那个枚举对象** ✓，
  // 不是一个只带正向格子的影子 ✓。
  {
    id: "ex-enum-in-nested-scopes",
    title: "枚举名在内层作用域里可见（函数 / 箭头 / 立即调用 / 类方法）",
    src: `
enum Color { Red = "r", Blue = "b" }
enum N { A = 1, B = 2 }
function inFunction(): string { return Color.Red; }
function inArrow(): number { return ((k: Color) => (k === Color.Blue ? 1 : 0))(Color.Blue); }
function inIife(): number { return (function (): number { return N.A + N.B; })(); }
function reverse(): string { return N[1]; }
class Holder { kind = Color.Blue; get(): string { return this.kind; } }
console.log(inFunction(), inArrow(), inIife(), reverse(), new Holder().get(), Color.Red);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  // **第 284 轮加宽（1 条）** ✓：这一条钉的是那一轮顺手改对的**求值顺序** ✓——
  // 对象字面量的**计算键**该**先算键、再算值** ✓（JS 的规范 ✓），
  // 而三条计算键的路原来**都是值在前** ✗（第 183 轮自己记成「已知差」✓）。
  // **为什么要有判据守着** ✗：只有**键或值里带副作用**时才看得出来 ✓——
  // 也就是说，「值在前」这个错在**所有没有副作用的写法上都不出声** ✗，
  // 光靠读代码或跑普通用法都发现不了 ✓，所以它搁了 100 轮 ✓。
  // **符号键的访问器**也放进来 ✓（`get [sym]()` ✓）：那是同一条路 ✓，
  // 而符号键的字符串化与数值键/字符串键**不是同一格**（`KeyUnitsOf` 那条路走不了符号 ✓）。
  {
    id: "ex-object-literal-key-order",
    title: "对象字面量的计算键：先算键再算值（含符号键访问器）",
    src: `
const order: string[] = [];
const next = (tag: string): string => { order.push(tag); return tag; };
const o: any = { [next("key")]: next("value") };
console.log(order.join(","), o.key);
const sym = Symbol("s");
const so: any = { get [sym]() { return "sym"; }, set [sym](v: string) { order.push("set:" + v); } };
console.log(so[sym]);
so[sym] = "x";
console.log(order.join(","));
`,
  },
];
