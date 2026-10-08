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

  // ============ 第 287 轮加宽（降级层：类型位擦除 / 泛型 / 修饰词 / 解构 / 展开 / 枚举 / namespace） ============
  {
    id: "ex-type-alias-erased",
    title: "type 别名整族擦除：联合 / 交叉 / 数组 / 元组 / 对象类型",
    src: `
type Id = number;
type Pair = [string, number];
type Union = "a" | "b" | 1 | null;
type Inter = { a: number } & { b: string };
type Fn = (x: number) => string;
const id: Id = 7;
const pair: Pair = ["x", 1];
const u: Union = "b";
const f: Fn = (x) => String(x);
console.log(id, pair.join(":"), u, f(3));
`,
  },
  {
    id: "ex-interface-erased-and-value",
    title: "interface 只是形状：实现它的对象照跑",
    src: `
interface Point { x: number; y: number; label?: string }
interface Named extends Point { name: string }
const p: Point = { x: 1, y: 2 };
const n: Named = { x: 3, y: 4, name: "n" };
function dist(a: Point, b: Point) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
console.log(p.x, n.name, dist(p, n));
`,
  },
  {
    id: "ex-generic-class-and-method",
    title: "泛型类 + 泛型方法 + 约束：类型位全擦、运行期只有值",
    src: `
class Box<T> {
  v: T;
  constructor(v: T) { this.v = v; }
  get(): T { return this.v; }
  map<U>(f: (x: T) => U): Box<U> { return new Box<U>(f(this.v)); }
}
function first<T extends { length: number }>(xs: T): number { return xs.length; }
const b = new Box<number>(3).map((x) => x * 2);
console.log(b.get(), first("abcd"), first([1, 2, 3]));
`,
  },
  {
    id: "ex-modifiers-erased",
    title: "readonly / public / private / protected / abstract 在值位上的效果",
    src: `
abstract class Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area(); }
}
class Square extends Shape {
  private readonly side: number;
  constructor(side: number) { super(); this.side = side; }
  area(): number { return this.side * this.side; }
}
console.log(new Square(3).describe(), new Square(3).area());
`,
  },
  {
    id: "ex-nonnull-and-as-chain",
    title: "非空断言与 as 串在一条链上",
    src: `
const o: any = { a: { b: [1, 2, 3] } };
console.log(o!.a!.b![1], (o as any).a.b.length);
const s: string | null = "x";
console.log(s!.length, (s as string).toUpperCase());
const n = (1 as unknown as string) as unknown as number;
console.log(n + 1);
`,
  },
  {
    id: "ex-satisfies-erased",
    title: "satisfies 是纯检查：产物一个指令都不该多",
    src: `
const config = { host: "h", port: 1 } satisfies { host: string; port: number };
const list = [1, 2] satisfies number[];
const nested = { a: { b: 1 } } satisfies Record<string, unknown>;
console.log(config.port, list.length, nested.a.b);
`,
  },
  {
    id: "ex-definite-assignment",
    title: "明确赋值断言 `!:` 与可选字段 `?:`：一个都不产生属性",
    src: `
class C {
  v!: number;
  w?: string;
  init() { this.v = 5; }
}
const c = new C();
console.log("v" in c, "w" in c, c.w);
c.init();
console.log(c.v, "v" in c, Object.keys(c).join(","));
`,
  },
  {
    id: "ex-overload-implementation",
    title: "重载签名 + 一条实现：前面的签名一个指令都不产生",
    src: `
function pick(n: number): string;
function pick(s: string): number;
function pick(v: any): any { return typeof v === "number" ? String(v) : v.length; }
console.log(pick(7), pick("abcd"));
`,
  },
  {
    id: "ex-optional-catch-binding",
    title: "catch 不带绑定（`catch {`）：照样接得住",
    src: `
try { throw new Error("x"); } catch { console.log("caught"); }
try { JSON.parse("{"); } catch { console.log("parse failed"); }
`,
  },
  {
    id: "ex-do-while-and-scope",
    title: "do..while 的块作用域与循环外的可见性",
    src: `
let n = 0;
do { const step = 2; n += step; } while (n < 5);
console.log(n);
let outer = "before";
{ let outer = "inner"; console.log(outer); }
console.log(outer);
`,
  },
  {
    id: "ex-for-of-destructure-map",
    title: "for..of 头部解构：Map 的键值对 / 数组的元组",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const [i, v] of [[0, "x"], [1, "y"]]) console.log(i, v);
const pairs: Array<[string, number]> = [["p", 1]];
for (const [k, v] of pairs) console.log(k, v);
`,
  },
  {
    id: "ex-for-of-string-labels",
    title: "for..of 走字符串（按码点）与带标签的循环退出",
    src: `
const chars: string[] = [];
for (const c of "abc") chars.push(c);
console.log(chars.join("-"), chars.length);
outer: for (const a of [1, 2]) { for (const b of [3, 4]) { if (b === 4) continue outer; console.log(a, b); } }
`,
  },
  {
    id: "ex-object-spread-and-destructure-mixed",
    title: "对象展开与解构混用：重命名 / 默认值 / 剩余",
    src: `
const src = { a: 1, b: 2, c: 3, d: 4 };
const { a, b: renamed, e = 9, ...rest } = src;
console.log(a, renamed, e, JSON.stringify(rest));
const merged = { ...src, b: 20, extra: true };
console.log(JSON.stringify(merged));
const nested: any = { p: { q: { r: 5 } } };
const { p: { q: { r } } } = nested;
console.log(r);
`,
  },
  {
    id: "ex-array-destructure-defaults-holes",
    title: "数组解构：跳位 / 默认值 / 剩余 / 嵌套",
    src: `
const xs = [1, , 3, 4, 5];
const [first, second = 20, , fourth, ...tail] = xs;
console.log(first, second, fourth, tail.join(","));
const [[a], [b, c = 0]] = [[1], [2]];
console.log(a, b, c);
`,
  },
  {
    id: "ex-spread-in-new-and-call",
    title: "展开落在 new 的实参与调用实参里（两个位置各一个）",
    src: `
class P { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } sum() { return this.x + this.y; } }
const args: [number, number] = [3, 4];
console.log(new P(...args).sum());
console.log(Math.max(...args), [0, ...args, 9].join(","));
const obj = { ...{ k: 1 }, ...{ k: 2 } };
console.log(JSON.stringify(obj));
`,
  },
  {
    id: "ex-computed-member-and-call",
    title: "计算成员访问与计算成员调用（含字符串键与数字键）",
    src: `
const key = "val";
const idx = 2;
const o: any = { val: () => "called", 2: "two" };
console.log(o[key](), o[idx], o[String(idx)]);
const arr: any = [10, 20, 30];
console.log(arr[idx], arr["length"], arr[arr.length - 1]);
`,
  },
  {
    id: "ex-object-literal-accessors-computed",
    title: "对象字面量里的访问器与计算键访问器",
    src: `
let store = 1;
const suffix = "X";
const o = {
  get plain() { return store; },
  set plain(v: number) { store = v; },
  get ["key" + suffix]() { return store * 10; },
  set ["key" + suffix](v: number) { store = v / 10; },
};
o.plain = 4;
console.log(o.plain, o.keyX);
o.keyX = 100;
console.log(store, Object.keys(o).join(","));
`,
  },
  {
    id: "ex-class-computed-and-static-init",
    title: "类的计算成员名 · 静态字段与静态块的初始化顺序",
    src: `
const k = "dyn";
const order: string[] = [];
class C {
  static a = (order.push("static-a"), 1);
  static { order.push("block"); }
  static b = (order.push("static-b"), 2);
  [k] = (order.push("field-dyn"), 3);
  plain = (order.push("field-plain"), 4);
  constructor() { order.push("ctor"); }
}
const c: any = new C();
console.log(order.join(","), c.dyn, c.plain, C.a, C.b);
`,
  },
  {
    id: "ex-private-methods-and-static-private",
    title: "私有方法 / 静态私有成员 / 私有名访问",
    src: `
class Counter {
  #n = 0;
  static #instances = 0;
  constructor() { Counter.#instances += 1; }
  #bump() { this.#n += 1; return this.#n; }
  tick() { return this.#bump(); }
  static get count() { return Counter.#instances; }
  has(o: any) { return #n in o; }
}
const a = new Counter();
const b = new Counter();
a.tick(); a.tick(); b.tick();
console.log(a.tick(), Counter.count, a.has(a), a.has({}));
`,
  },
  {
    id: "ex-arrow-and-this-binding",
    title: "箭头函数的 this 来自定义处：类字段箭头 / 嵌套箭头 / 回调",
    src: `
class Greeter {
  name = "g";
  arrow = () => this.name;
  nested = () => (() => this.name)();
  regular() { return [1].map(() => this.name)[0]; }
}
const g = new Greeter();
const loose = g.arrow;
console.log(loose(), g.nested(), g.regular());
`,
  },
  {
    id: "ex-getter-in-class-and-inherit-chain",
    title: "类的访问器沿继承链走：三层各写一半",
    src: `
class A { get v() { return 1; } }
class B extends A { get v() { return super.v + 10; } }
class C extends B { get v() { return super.v + 100; } }
console.log(new A().v, new B().v, new C().v);
`,
  },
  {
    id: "ex-enum-heterogeneous",
    title: "异构 enum（数字 + 字符串成员）与反向映射",
    src: `
enum Mixed { A = 1, B = 2, C = "c" }
console.log(Mixed.A, Mixed.B, Mixed.C, Mixed[1], Mixed[2], Mixed["c"]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-enum-const-and-usage",
    title: "const enum 在模块内的用法（与普通 enum 同形）",
    src: `
const enum Dir { Up, Down }
function move(d: Dir) { return d === Dir.Up ? "up" : "down"; }
console.log(Dir.Up, Dir.Down, move(Dir.Up), Dir[0]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-namespace-with-values",
    title: "namespace 里有运行期东西：对象、函数、内部引用",
    src: `
namespace Utils {
  export const version = 2;
  export function add(a: number, b: number) { return a + b; }
  export const doubled = add(version, version);
}
console.log(Utils.version, Utils.add(1, 2), Utils.doubled);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-namespace-nested-with-values",
    title: "嵌套 namespace：外层套内层、两层的值都能取到",
    src: `
namespace Outer {
  export namespace Inner {
    export const v = "deep";
    export function f() { return v + "!"; }
  }
  export const top = "top";
}
console.log(Outer.top, Outer.Inner.v, Outer.Inner.f());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-parameter-properties-variants",
    title: "参数属性的四种修饰：public / private / readonly / 默认值",
    src: `
class C {
  constructor(public a: number, private b: string, protected readonly c = 3, public d?: number) {}
  show() { return this.a + this.b + this.c + this.d; }
}
const c = new C(1, "x");
console.log(c.show(), c.a, Object.keys(c).join(","));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-abstract-implements-shape",
    title: "abstract class + implements：接口只擦掉、抽象方法由子类补",
    src: `
interface Runner { run(): string }
abstract class Base implements Runner {
  abstract run(): string;
  go() { return "go:" + this.run(); }
}
class Impl extends Base { run() { return "impl"; } }
console.log(new Impl().go(), new Impl().run());
`,
  },
  {
    id: "ex-type-assertion-in-expressions",
    title: "as 落在实参 / 返回 / 数组元素 / 三元分支里",
    src: `
function id(x: any) { return x; }
console.log(id(1 as any), id("s" as string), [1 as number, 2 as number].length);
const flag = true;
console.log(flag ? (1 as number) : (2 as number));
const cast = { a: 1 } as { a: number };
console.log(cast.a);
`,
  },
  {
    id: "ex-this-parameter-and-type-predicate",
    title: "this 形参与类型谓词：两个都只活在类型位",
    src: `
function isString(this: any, v: any): v is string { return typeof v === "string"; }
interface Box { n: number }
function hasN(v: any): v is Box { return typeof v.n === "number"; }
console.log(isString("a"), isString(1), hasN({ n: 1 }), hasN({}));
`,
  },
  {
    id: "ex-index-signature-object",
    title: "索引签名类型：字面量照跑、读法照常",
    src: `
interface Dict { [k: string]: number }
const d: Dict = { a: 1, b: 2 };
d.c = 3;
let total = 0;
for (const k in d) total += d[k];
console.log(total, Object.keys(d).join(","), d["a"] + d["b"]);
`,
  },
  {
    id: "ex-tuple-and-readonly-array",
    title: "元组类型与 readonly 数组：类型位只擦掉",
    src: `
type Pair = readonly [string, number];
const p: Pair = ["k", 1];
const xs: readonly number[] = [1, 2, 3];
console.log(p[0], p[1], xs.length, xs.reduce((a, b) => a + b, 0));
const asConst = [1, "a"] as const;
console.log(asConst[0], asConst.length);
`,
  },
  {
    id: "ex-import-type-erased",
    title: "`import type` 与类型位限定名：一个运行期引用都不产生",
    src: `
type Local = { v: number };
const x: Local = { v: 1 };
type Key = keyof Local;
type Val = Local["v"];
const k: Key = "v";
const val: Val = 2;
console.log(x.v, k, val);
`,
  },
  {
    id: "ex-declare-and-ambient-erased",
    title: "declare 一族（const / let / function / class / global）：全擦掉",
    src: `
declare const ambientValue: number;
declare function ambientFn(x: number): string;
declare class AmbientClass { m(): void }
declare global { interface Window { extra: number } }
const local = 1;
console.log(local, typeof ambientValue);
`,
  },
  {
    id: "ex-arrow-returning-object-and-ternary",
    title: "箭头函数返回对象字面量 / 三元 / 数组",
    src: `
const make = (n: number) => ({ n, doubled: n * 2 });
const pick = (b: boolean) => (b ? { ok: true } : { ok: false });
const list = (n: number) => [n, n + 1];
console.log(make(3).doubled, pick(false).ok, list(5).join(","));
`,
  },
  {
    id: "ex-template-literal-shapes",
    title: "模板字面量：多行 / 嵌套调用 / 表达式里再模板",
    src: `
const n = 3;
const multi = \`a
b\${n}\`;
const nested = \`outer \${\`inner \${n * 2}\`} end\`;
const inExpr = \`\${n > 2 ? \`big:\${n}\` : "small"}\`;
console.log(multi, nested, inExpr, multi.length);
`,
  },
  {
    id: "ex-optional-chain-in-many-slots",
    title: "可选链落在实参 / 数组元素 / 模板 / 条件里（第 143 轮那一族）",
    src: `
const o: any = { a: 1 };
function f(v: any) { return v === undefined ? "u" : v; }
console.log(f(o?.a), f(o?.missing), [o?.a, o?.b].join(","));
console.log(\`\${o?.a}|\${o?.b}\`);
if (o?.a) console.log("truthy");
console.log(o?.a?.toString?.().length ?? -1);
`,
  },
  {
    id: "ex-nested-function-and-scope-capture",
    title: "函数里再声明函数：捕获、遮蔽、互相调用",
    src: `
function outer() {
  const v = "outer";
  function inner() { return v; }
  function shadow() { const v = "shadow"; return v; }
  return inner() + "/" + shadow();
}
function mutual(n: number): number { return n <= 0 ? 0 : even(n - 1); }
function even(n: number): number { return n <= 0 ? 1 : mutual(n - 1); }
console.log(outer(), mutual(4), even(4));
`,
  },
  {
    id: "ex-function-decl-in-block-scope",
    title: "块里的函数声明：块内可见、块外是另一格",
    src: `
function f() {
  { function g() { return "inner"; } console.log(g()); }
  return typeof g;
}
console.log(f());
const h = function named() { return "named"; };
console.log(h(), typeof named);
`,
  },
  {
    id: "ex-async-arrow-and-method",
    title: "async 的三条形状：箭头 / 方法 / 类方法，各自 await",
    src: `
const arrow = async (n: number) => (await Promise.resolve(n)) + 1;
const obj = { async m(n: number) { return (await Promise.resolve(n)) * 2; } };
class C { async run(n: number) { return (await Promise.resolve(n)) - 1; } }
async function main() {
  console.log(await arrow(1), await obj.m(2), await new C().run(3));
}
main();
`,
  },
  {
    id: "ex-try-catch-finally-typed-and-optional",
    title: "try / catch 带类型标注 / finally 三件套齐活",
    src: `
function run(mode: string) {
  const log: string[] = [];
  try { log.push("try"); if (mode === "throw") throw new TypeError("t"); log.push("ok"); }
  catch (e: unknown) { log.push("catch:" + (e as Error).message); }
  finally { log.push("finally"); }
  return log.join("|");
}
console.log(run("throw"), run("fine"));
`,
  },
  {
    id: "ex-switch-with-union-types",
    title: "switch 上判别联合类型的几个成员：类型位不影响运行",
    src: `
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
function area(s: Shape) {
  switch (s.kind) {
    case "circle": return Math.round(3 * s.r * s.r);
    case "square": return s.side * s.side;
  }
}
console.log(area({ kind: "circle", r: 2 }), area({ kind: "square", side: 3 }));
`,
  },

  {
    id: "ex-generic-arrow-function",
    title: "泛型箭头函数：<T>(x: T) => x",
    src: `
const id = <T>(x: T): T => x;
console.log(id(1), id("a"), id(true));
`,
  },
  {
    id: "ex-generic-arrow-constraint",
    title: "泛型箭头带约束：<T extends { length: number }>",
    src: `
const len = <T extends { length: number }>(x: T): number => x.length;
console.log(len("abc"), len([1, 2]), len({ length: 9 }));
`,
  },
  {
    id: "ex-constructor-overloads",
    title: "构造函数重载签名 + 一个实现",
    src: `
class P {
  x: number;
  constructor(x: number);
  constructor(x: string);
  constructor(x: any) {
    this.x = typeof x === "number" ? x : x.length;
  }
}
console.log(new P(3).x, new P("abcd").x);
`,
  },
  {
    id: "ex-abstract-method-and-implement",
    title: "抽象方法 + 子类实现 + instanceof",
    src: `
abstract class Shape {
  abstract area(): number;
  describe(): string {
    return "area=" + this.area();
  }
}
class Sq extends Shape {
  s: number;
  constructor(s: number) {
    super();
    this.s = s;
  }
  area(): number {
    return this.s * this.s;
  }
}
const q = new Sq(3);
console.log(q.area(), q.describe(), q instanceof Shape);
`,
  },
  {
    id: "ex-interface-extends-generic-implements",
    title: "接口继承泛型接口，类再 implements",
    src: `
interface A<T> { a: T }
interface B<T> extends A<T> { b: T }
class C implements B<number> { a = 1; b = 2 }
const c = new C();
console.log(c.a + c.b);
`,
  },
  {
    id: "ex-declare-module-and-global",
    title: "declare module / declare global 一条运行期指令都不产生",
    src: `
declare module "some-lib" {
  export const value: number;
}
declare global {
  interface Window { z: number }
}
declare const ambient: number;
console.log("ok", typeof ambient);
`,
  },
  {
    id: "ex-optional-chain-index",
    title: "可选链接下标：o.a?.[0]?.b",
    src: `
const o: any = { a: [{ b: 1 }] };
console.log(o.a?.[0]?.b, o.x?.[0]?.b, o.a?.[1]?.b);
`,
  },
  {
    id: "ex-arrow-immediately-invoked-typed",
    title: "带类型标注的箭头立即调用",
    src: `
console.log(((a: number, b: number) => a + b)(1, 2));
`,
  },
  {
    id: "ex-nonnull-chain-index",
    title: "非空断言串在成员链上：o!.a!.b![1]",
    src: `
const o: any = { a: { b: [1, 2] } };
console.log(o!.a!.b![1]);
`,
  },
  {
    id: "ex-as-arithmetic-precedence",
    title: "as 与二元运算符的优先级：(a as number) + 1",
    src: `
const a: unknown = 1;
console.log((a as number) + 1, (a as number) * 3);
`,
  },
  {
    id: "ex-satisfies-as-const-combo",
    title: "as const 与 satisfies 一起用",
    src: `
const cfg = { a: 1, b: "x" } as const satisfies { a: number; b: string };
console.log(cfg.a, cfg.b);
const fn = ((x: number) => x * 2) satisfies (x: number) => number;
console.log(fn(3));
`,
  },
  {
    id: "ex-enum-namespace-merge",
    title: "enum 与 namespace 合并：两份都在同一个名字上",
    src: `
enum E { A = 1, B = 2 }
namespace E { export const label = "e"; }
console.log(E.A, E.B, E.label);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "ex-this-type-and-polymorphic",
    title: "this 类型：返回 this、链式调用",
    src: `
class C {
  v = 0;
  set(n: number): this {
    this.v = n;
    return this;
  }
}
const c = new C().set(1).set(2);
console.log(c.v, c instanceof C);
`,
  },
  {
    id: "ex-indexed-access-and-keyof",
    title: "keyof / 下标访问类型：只用类型、运行期照样跑",
    src: `
type O = { a: number; b: string };
type K = keyof O;
type V = O["a"];
const k: K = "a";
const v: V = 1;
console.log(k, v, typeof v);
`,
  },
  {
    id: "ex-mapped-type-modifiers",
    title: "映射类型带 readonly / 可选修饰",
    src: `
type M<T> = { readonly [K in keyof T]?: T[K] };
const m: M<{ a: number }> = { a: 1 };
console.log(m.a);
`,
  },
  {
    id: "ex-template-literal-type",
    title: "模板字面量类型：`hello ${string}`",
    src: `
type Greet = \`hello \${string}\`;
const g: Greet = "hello world";
console.log(g);
`,
  },
  {
    id: "ex-conditional-infer-type",
    title: "条件类型里的 infer",
    src: `
type El<T> = T extends (infer U)[] ? U : never;
const x: El<number[]> = 3;
const y: El<string> = "z" as never;
console.log(x, typeof y);
`,
  },
  {
    id: "ex-assertion-function",
    title: "断言函数：asserts x is string",
    src: `
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== "string") throw new Error("not a string");
}
const v: unknown = "hi";
assertIsString(v);
console.log(v.length);
try {
  assertIsString(1 as unknown);
} catch (e) {
  console.log((e as Error).message);
}
`,
  },
  {
    id: "ex-destructured-params-defaults",
    title: "解构形参 + 整段默认值 + 元素默认值",
    src: `
function f({ a = 1, b }: { a?: number; b: string } = { b: "z" }) {
  return a + b;
}
console.log(f(), f({ b: "q" }), f({ a: 5, b: "w" }));
`,
  },
  {
    id: "ex-static-block-with-loop",
    title: "静态块里跑循环与判断",
    src: `
class C {
  static xs: number[] = [];
  static {
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) C.xs.push(i);
    }
  }
}
console.log(C.xs.join(","));
`,
  },
  {
    id: "ex-readonly-array-param",
    title: "readonly 数组形参：类型位擦掉、值照走",
    src: `
function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
const xs: readonly number[] = [1, 2, 3];
console.log(sum(xs), sum([4, 5]));
`,
  },
  {
    id: "ex-union-narrowing-typeof",
    title: "联合类型 + typeof 收窄：两个分支都跑",
    src: `
function f(x: string | number): string {
  if (typeof x === "string") return x.toUpperCase();
  return x.toFixed(1);
}
console.log(f("abc"), f(2));
`,
  },
  {
    id: "ex-intersection-type-value",
    title: "交叉类型：值位只是对象字面量",
    src: `
type A = { a: number };
type B = { b: number };
const ab: A & B = { a: 1, b: 2 };
console.log(ab.a + ab.b);
`,
  },
  {
    id: "ex-unique-symbol-type",
    title: "unique symbol 与计算属性名",
    src: `
const key: unique symbol = Symbol("k");
const o = { [key]: 1 };
console.log(o[key], typeof key);
`,
  },
  {
    id: "ex-as-in-default-param",
    title: "默认值里写 as",
    src: `
function f(x = 1 as number) {
  return x;
}
console.log(f(), f(2));
`,
  },
  {
    id: "ex-optional-chain-on-call-result",
    title: "调用结果上的可选链：f()?.a",
    src: `
const f = (): any => ({ a: 1 });
console.log(f()?.a, f()?.b?.c);
`,
  },
  {
    id: "ex-type-predicate-arrow-as-callback",
    title: "类型谓词写在箭头上、当回调传",
    src: `
const isNum = (x: unknown): x is number => typeof x === "number";
console.log([1, "a", 2].filter(isNum).join(","));
`,
  },
  {
    id: "ex-generic-class-static-and-field",
    title: "泛型类：静态成员、字段、方法各一份",
    src: `
class Box<T> {
  static count = 0;
  v: T;
  constructor(v: T) {
    this.v = v;
    Box.count++;
  }
  map<U>(f: (x: T) => U): Box<U> {
    return new Box(f(this.v));
  }
}
const b = new Box(2).map((x) => x * 3);
console.log(b.v, Box.count);
`,
  },
  {
    id: "ex-abstract-new-type-position",
    title: "类型位上的 abstract new：值位只是一个类",
    src: `
type Ctor<T> = abstract new (x: number) => T;
class A {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}
const C: Ctor<A> = A;
console.log(new C(4).x);
`,
  },
  {
    id: "ex-optional-and-rest-with-generics",
    title: "带泛型的可选形参与剩余形参",
    src: `
function f<T>(a: T, b?: T, ...rest: T[]): string {
  return [a, b, rest.length].join("|");
}
console.log(f(1), f(1, 2), f("a", "b", "c", "d"));
`,
  },
  {
    id: "ex-nonnull-in-call-args",
    title: "非空断言落在实参位上",
    src: `
let maybe: { m: () => number } | null = { m: () => 3 };
console.log(maybe!.m());
`,
  },
  {
    id: "ex-arrow-generic-in-call-args",
    title: "泛型箭头直接当实参",
    src: `
const apply = <T, U>(v: T, f: (x: T) => U): U => f(v);
console.log(apply(2, <T,>(x: T): T => x));
`,
  },

  {
    id: "ex-type-alias-same-line",
    title: "类型别名与后续语句写在同一行：别名擦掉、语句照跑",
    src: `
type F = () => number; const f: F = () => 7; console.log(f());
interface I { n: number } const v: I = { n: 1 }; console.log(v.n);
type G = { a: number } | null; const g: G = { a: 2 }; console.log(g.a);
`,
  },
  // ===== 第 291 轮加宽：exec / runtime / 标准库 三层一起铺 =====
  {
    id: "c291-ex-type-only-constructs-erased",
    title: "类型位整族擦除：type / interface / declare",
    src: `
type A = { x: number };
interface B { y: string }
declare const z: number;
const a: A = { x: 1 };
const b: B = { y: "s" };
console.log(a.x, b.y);
`,
  },
  {
    id: "c291-ex-generics-erased-forms",
    title: "泛型函数与泛型类的擦除",
    src: `
function id<T>(x: T): T { return x; }
class Box<T> { v: T; constructor(v: T) { this.v = v; } get(): T { return this.v; } }
console.log(id(1), id("s"), new Box(5).get());
`,
  },
  {
    id: "c291-ex-enum-numeric-and-string",
    title: "数值枚举的反向映射与字符串枚举",
    src: `
enum Color { Red, Green = 5, Blue }
enum Name { A = "a", B = "b" }
console.log(Color.Red, Color.Green, Color.Blue, Color[5]);
console.log(Name.A, Name.B);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-declare-module-erased",
    title: "declare module / declare global 一行运行期东西都不产生",
    src: `
declare module "x" { export const y: number; }
declare global { interface Window { z: number } }
console.log("ok", 1);
`,
  },
  {
    id: "c291-ex-overloads-erased",
    title: "重载签名擦除、只剩实现",
    src: `
function f(a: number): number;
function f(a: string): string;
function f(a: any): any { return a; }
console.log(f(1), f("s"));
`,
  },
  {
    id: "c291-ex-abstract-members",
    title: "抽象类与抽象成员",
    src: `
abstract class A { abstract m(): number; n = 1; }
class B extends A { m() { return this.n; } }
console.log(new B().m());
`,
  },
  {
    id: "c291-ex-readonly-tuple-and-assertions",
    title: "as const 与 readonly 数组",
    src: `
const t = [1, "a"] as const;
const ro: readonly number[] = [1, 2];
console.log(t[0], t[1], ro.length, ro[0]);
`,
  },
  {
    id: "c291-ex-satisfies-forms",
    title: "satisfies 的两种位置",
    src: `
const cfg = { a: 1, b: "x" } satisfies { a: number; b: string };
const arr = [1, 2] satisfies number[];
console.log(cfg.a, cfg.b, arr.length);
`,
  },
  {
    id: "c291-ex-optional-chain-and-nonnull",
    title: "可选链与非空断言混用",
    src: `
const o: any = { a: { b: 1 } };
console.log(o?.a?.b, o!.a!.b, o?.["a"]?.["b"]);
console.log(o.m?.[0], (o as any).z?.y);
`,
  },
  {
    id: "c291-ex-class-modifiers-erased",
    title: "类成员的修饰词与私有名",
    src: `
class C {
  private a = 1;
  protected b = 2;
  public readonly c = 3;
  static d = 4;
  #e = 5;
  sum() { return this.a + this.b + this.c + this.#e; }
  static getD() { return C.d; }
}
console.log(new C().sum(), C.getD());
`,
  },
  {
    id: "c291-ex-this-parameter",
    title: "this 形参",
    src: `
function f(this: { n: number }) { return this.n; }
console.log(f.call({ n: 5 }));
`,
  },
  {
    id: "c291-ex-type-predicates",
    title: "类型谓词不产生运行期东西",
    src: `
function isString(x: unknown): x is string { return typeof x === "string"; }
console.log(isString("a"), isString(1));
`,
  },
  {
    id: "c291-ex-mapped-and-conditional-types",
    title: "映射类型与条件类型的擦除",
    src: `
type Keys<T> = { [K in keyof T]: T[K] };
type Unwrap<T> = T extends Promise<infer U> ? U : T;
const v: Keys<{ a: number }> = { a: 1 };
const r: Unwrap<number> = 2;
console.log(v.a, r);
`,
  },
  {
    id: "c291-ex-template-literal-types",
    title: "模板字面量类型",
    src: `
type Greeting = \`hello \${string}\`;
const g: Greeting = "hello world";
console.log(g);
`,
  },
  {
    id: "c291-ex-discriminated-union-narrowing",
    title: "可辨识联合：类型位擦除、值位照样缩窄",
    src: `
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
function area(x: Shape): number {
  if (x.kind === "circle") return 3 * x.r * x.r;
  return x.s * x.s;
}
console.log(area({ kind: "circle", r: 2 }), area({ kind: "square", s: 3 }));
`,
  },
  {
    id: "c291-ex-destructure-params-and-defaults",
    title: "解构形参与默认值",
    src: `
function f({ a, b = 2 }: { a: number; b?: number }, [c, d = 4]: number[] = [3]) { return a + b + c + d; }
console.log(f({ a: 1 }), f({ a: 1, b: 10 }, [1, 2]));
`,
  },
  {
    id: "c291-ex-class-expression-and-name",
    title: "类表达式与具名类表达式",
    src: `
const C = class { m() { return "c"; } };
const D = class Named extends C { m() { return super.m() + "D"; } };
console.log(new C().m(), new D().m(), typeof D);
`,
  },
  {
    id: "c291-ex-parameter-properties-variants",
    title: "构造函数参数属性的三种修饰",
    src: `
class P { constructor(private readonly a: number, public b = 2, protected c?: string) {} sum() { return this.a + this.b + (this.c?.length ?? 0); } }
console.log(new P(1).sum(), new P(1, 5, "ab").sum());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-as-and-index-precedence",
    title: "as / 非空断言与下标、成员访问的优先级",
    src: `
const x: any = { a: [1, 2, 3] };
console.log((x as any).a.length, x!.a[0], (x as any)["a"][1]);
`,
  },
  {
    id: "c291-ex-const-enum-and-usage",
    title: "const enum 的使用",
    src: `
const enum Dir { Up = 1, Down }
const d: Dir = Dir.Up;
console.log(d, d === 1, Dir.Down);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-optional-catch-and-finally",
    title: "可选 catch 绑定与 finally",
    src: `
try { throw new Error("x"); } catch { console.log("caught"); } finally { console.log("fin"); }
`,
  },
  {
    id: "c291-ex-interface-only-file",
    title: "只有类型位的文件照样跑得动",
    src: `
interface I { a: number }
type T = I | null;
const i: I = { a: 1 };
const t: T = i;
console.log(t === i, i.a);
`,
  },
  {
    id: "c291-ex-class-implements-and-generic",
    title: "implements 与泛型约束",
    src: `
interface Shape { area(): number }
class Sq implements Shape { constructor(private n: number) {} area() { return this.n * this.n; } }
function measure<T extends Shape>(s: T): number { return s.area(); }
console.log(measure(new Sq(3)));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-namespace-with-values",
    title: "带值的 namespace",
    src: `
namespace N { export const a = 1; export function f() { return a + 1; } }
console.log(N.a, N.f());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-nested-namespace-with-values",
    title: "嵌套一层的 namespace",
    src: `
namespace Outer { export namespace Inner { export const v = 2; } export const w = Inner.v + 1; }
console.log(Outer.w, Outer.Inner.v);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c291-ex-enum-namespace-merge",
    title: "枚举与 namespace 合并",
    src: `
enum E { A = 1 }
namespace E { export const extra = 2; }
console.log(E.A, E.extra);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  // ===== 第 301 轮补的一条：类表达式里的 constructor =====
  // 它是**量那条红条时顺手加的** ✓（用户口径：「发现新问题就加对应语料」✓）——
  // 类**表达式**里的 `constructor` 原来被投成 `MethodDeclaration` ✗（只有 `ClassDeclaration`
  // 那一格认它 ✓），降级层于是**合成一个空构造函数** ✓、写着的那个整条不跑 ✗。
  // 这一条把**三个落点**一起钉住 ✓：构造函数体跑了 ✓、字段初始化式的**次序**对 ✓、
  // 以及**派生类**那一档不受影响 ✓。
  {
    id: "c301-class-expression-constructor",
    title: "类表达式里的 constructor：体要跑、字段初始化要在体之前",
    src: `
interface Ctor { new (n: number): { n: number } }
const K: Ctor = class { n: number; constructor(n: number) { this.n = n; } };
console.log(new K(4).n);
const L = class Named { n = 1; constructor(v: number) { this.n = v; } };
console.log(new L(7).n);
const Base = class { greet(): string { return "base"; } };
const Derived = class extends Base { tag = "d"; constructor() { super(); this.tag = this.tag + "!"; } };
const d = new Derived();
console.log(d.greet(), d.tag);
`
  },
  // ===== 第 302 轮补的一条：被调用者是括号 / 成员链的立即调用 =====
  // 它是**量那条红条时顺手加的** ✓（用户口径：「发现新问题就加对应语料」✓）——
  // 实参括号里的逗号在**时序上**先被折成了算子单元 ✓，于是 `arguments` 只剩一格 ✗、
  // 形参拿到的是**最后一个**实参 ✓（`NaN` ✓，**一句异常都没有** ✗）。
  // 这一条把**四种被调用者形状**一起钉住 ✓：括号 ✓、括号里的箭头 ✓、括号里的函数表达式 ✓、
  // 以及**成员链**（`o.m` / `arr[0]`）那两种里已经通了的那一种 ✓。
  {
    id: "c302-callee-shapes-with-arguments",
    title: "被调用者是括号 / 箭头 / 函数表达式时，实参表照样按顶层逗号切开",
    src: `
const h = (a: number, b: number) => a + b;
console.log((h)(1, 2), ((a: number, b: number) => a + b)(3, 4));
console.log((function (a: number, b: number) { return a * b; })(5, 6));
console.log((((a: number, b: number) => a - b))(7, 8));
const three = ((a: number, b: number, c: number) => a + b + c)(1, 2, 3);
console.log(three);
const group = (1, 2);
console.log(group);
`
  },
  // ===== 第 303 轮补的一条：非空断言后面直接跟下标 =====
  // 它是**量那条红条时顺手加的** ✓（用户口径：「发现新问题就加对应语料」✓）——
  // `o.b![1]` 里那个 `[1]` 谁也不认它 ✓，于是**按数组字面量成形** ✓、
  // 而投影那一支只把 `NotNull` 单独投出来 ✓ ⇒ `[1]` **整个丢掉** ✗（给的是那个数组本身 ✓，
  // **静默错值** ✗）。这一条把**四种落点**一起钉住 ✓：属性链尾 ✓、断言连着断言 ✓、
  // 字符串 ✓、以及下标之后**还能接着走**（`.length` / 再一个下标 ✓）。
  {
    id: "c303-nonnull-then-index",
    title: "非空断言后面直接跟下标：那一格是下标，不是数组字面量",
    src: `
const o: any = { b: [1, 2, 3] };
console.log(o.b![1], o.b![0]);
const s: any = "abc";
console.log(s![0], s![2]);
const a: any = [7, 8];
console.log(a[0]!, o.b[0]! + 1);
const deep: any = { a: { b: [3, 4] } };
console.log(deep!.a!.b![1]);

// **这一条钉三格** ✓：断言后面直接跟下标 ✓、下标后面再跟断言（a[0]! ✓）、
// 以及断言连着断言再接下标（deep!.a!.b![1] ✓）。
// **没做的一格** ✗（写在 typescript-exec/README.md 第 303 轮那一节 ✓）：
//   · 下标后面**再跟一个下标**（x![1]![0] ✓）——第二个方括号会掉；
//   · 下标后面**再进一个二元运算**（o.b![2] + 0 ✓）——那个方括号会被折进 BinaryOperator 里。
`,
  },

  // ===== 第 304 轮：加宽矩阵（42 条）=====

  {
    id: "c304-ex-generic-call-type-args",
    title: "泛型函数带显式类型实参调用",
    src: `
function first<T>(xs: T[]): T | undefined { return xs[0]; }
console.log(first<number>([1, 2]), first<string>(["a"]));
const pick = <T,>(v: T): T => v;
console.log(pick<number>(7), pick("s"));
`,
  },
  {
    id: "c304-ex-type-param-defaults-value",
    title: "类型形参带默认值：运行期一个痕迹都没有",
    src: `
interface Box<T = string> { value: T }
function wrap<T = number>(v: T): Box<T> { return { value: v }; }
console.log(wrap(1).value, wrap<boolean>(true).value);
const b: Box = { value: "s" };
console.log(b.value);
`,
  },
  {
    id: "c304-ex-interface-multiple-implements",
    title: "一个类 implements 两个接口",
    src: `
interface Named { name: string }
interface Aged { age: number }
class Person implements Named, Aged {
  name: string;
  age: number;
  constructor(name: string, age: number) { this.name = name; this.age = age; }
}
const p: Named & Aged = new Person("kim", 30);
console.log(p.name, p.age, p instanceof Person);
`,
  },
  {
    id: "c304-ex-enum-inside-function",
    title: "枚举写在函数体里面",
    src: `
function pick(which: string): string {
  enum Mode { A = "a", B = "b" }
  return which === "a" ? Mode.A : Mode.B;
}
console.log(pick("a"), pick("z"), pick("b"));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-const-assertion-object",
    title: "`as const` 落在对象与数组上",
    src: `
const cfg = { mode: "fast", retries: 3 } as const;
const dirs = ["up", "down"] as const;
console.log(cfg.mode, cfg.retries, dirs.join(","));
function use(d: typeof dirs[number]) { return d.toUpperCase(); }
console.log(use("up"));
`,
  },
  {
    id: "c304-ex-satisfies-with-generic",
    title: "satisfies 配上泛型调用",
    src: `
type Handler<T> = (v: T) => string;
const h = ((v: number) => "n" + v) satisfies Handler<number>;
console.log(h(3));
const table = { a: 1, b: 2 } satisfies Record<string, number>;
console.log(Object.keys(table).join(","), table.a + table.b);
`,
  },
  {
    id: "c304-ex-abstract-static-members",
    title: "抽象类里的静态成员与子类实现",
    src: `
abstract class Shape {
  static count = 0;
  abstract area(): number;
  describe(): string { return this.constructor.name + ":" + this.area(); }
}
class Square extends Shape {
  constructor(private side: number) { super(); Shape.count += 1; }
  area(): number { return this.side * this.side; }
}
const s = new Square(3);
console.log(s.describe(), Shape.count, s instanceof Shape);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-parameter-property-with-default",
    title: "参数属性带默认值，还有 readonly",
    src: `
class Point {
  constructor(public x = 0, public y = 0, private readonly tag = "p") {}
  show(): string { return this.tag + "(" + this.x + "," + this.y + ")"; }
}
console.log(new Point().show(), new Point(1, 2).show(), new Point(3).y);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-declare-const-and-usage",
    title: "declare const 只声明形状，值由别处给",
    src: `
declare const VERSION: string;
declare function external(x: number): number;
type Cfg = { a: number };
const cfg: Cfg = { a: 1 };
console.log(cfg.a, typeof VERSION, typeof external);
`,
  },
  {
    id: "c304-ex-generic-const-type-param",
    title: "const 类型形参（TS 5.0）",
    src: `
function tuple<const T extends readonly unknown[]>(xs: T): T { return xs; }
const t = tuple([1, "a", true]);
console.log(t.length, t[0], t[2]);
const lit = <const T,>(v: T) => v;
console.log(lit("x"));
`,
  },
  {
    id: "c304-ex-as-const-tuple",
    title: "`as const` 元组与展开",
    src: `
const pair = [1, "two"] as const;
const [n, s] = pair;
console.log(n, s, pair.length);
const spread = [...pair] as const;
console.log(spread[0], spread[1]);
`,
  },
  {
    id: "c304-ex-nonnull-in-optional-chain",
    title: "非空断言与可选链混着写",
    src: `
type Node2 = { next?: Node2 | null; value: number };
const n: Node2 = { value: 1, next: { value: 2 } };
console.log(n.next!.value, n.next?.value, n.next!.next?.value);
const arr: number[][] | null = [[1], [2]];
console.log(arr![0]![0], arr?.[1]?.[0]);
`,
  },
  {
    id: "c304-ex-type-predicate-callback",
    title: "类型谓词写在回调与箭头里",
    src: `
function isString(v: unknown): v is string { return typeof v === "string"; }
const mixed: unknown[] = [1, "a", true, "b"];
console.log(mixed.filter(isString).join(","));
const isNum = (v: unknown): v is number => typeof v === "number";
console.log(mixed.filter(isNum).length);
`,
  },
  {
    id: "c304-ex-readonly-class-property",
    title: "readonly 字段：只在类型位，运行期可写",
    src: `
class Cfg {
  readonly name: string;
  readonly items: readonly string[];
  constructor(name: string, items: string[]) { this.name = name; this.items = items; }
}
const c = new Cfg("a", ["x"]);
console.log(c.name, c.items.join(","));
`,
  },
  {
    id: "c304-ex-definite-assignment-class-field",
    title: "确定赋值断言 `x!: T` 落在类字段上",
    src: `
class Holder {
  value!: number;
  init() { this.value = 7; return this.value; }
}
const h = new Holder();
console.log(h.init(), h.value);
`,
  },
  {
    id: "c304-ex-override-modifier",
    title: "`override` 修饰符：运行期一个字都不留",
    src: `
class Base { greet(): string { return "base"; } }
class Derived extends Base {
  override greet(): string { return "derived+" + super.greet(); }
}
console.log(new Derived().greet());
`,
  },
  {
    id: "c304-ex-satisfies-array-value",
    title: "satisfies 落在数组字面量上",
    src: `
const xs = [1, 2, 3] satisfies number[];
const ys = ["a", "b"] satisfies readonly string[];
console.log(xs.reduce((a, b) => a + b, 0), ys.join(""));
const nested = { list: [1, 2] } satisfies { list: number[] };
console.log(nested.list.length);
`,
  },
  {
    id: "c304-ex-infer-conditional-type",
    title: "条件类型里的 infer 只活在类型位",
    src: `
type Unwrap<T> = T extends Promise<infer U> ? U : T extends Array<infer V> ? V : T;
type A = Unwrap<Promise<number>>;
type B = Unwrap<string[]>;
const a: A = 1;
const b: B = "s";
console.log(a, b, typeof a, typeof b);
`,
  },
  {
    id: "c304-ex-template-literal-type-value",
    title: "模板字面量类型与运行期模板串同时出现",
    src: "\ntype Greeting = `hello ${string}`;\nfunction greet(who: Greeting): string { return who + \"!\"; }\nconst name = \"world\";\nconsole.log(greet(`hello ${name}`));\nconsole.log(`n=${1 + 2}`);\n",
  },
  {
    id: "c304-ex-this-type-in-method",
    title: "this 类型与多态 this 只在类型位",
    src: `
class Builder {
  value = "";
  add(s: string): this { this.value += s; return this; }
}
class Sub extends Builder { tag = "sub"; }
const out = new Sub().add("a").add("b");
console.log(out.value, out.tag, out instanceof Sub);
`,
  },
  {
    id: "c304-ex-namespace-merged-function",
    title: "函数与命名空间合并（挂静态格）",
    src: `
function make(n: number): number { return n * 2; }
namespace make {
  export const version = "1.0";
  export function help(): string { return "help:" + version; }
}
console.log(make(3), make.version, make.help());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-class-implements-generic",
    title: "类实现泛型接口并带头部类型实参",
    src: `
interface Repo<T> { get(id: number): T | undefined; all(): T[] }
class MemRepo<T extends { id: number }> implements Repo<T> {
  private rows: T[] = [];
  add(row: T) { this.rows.push(row); }
  get(id: number): T | undefined { return this.rows.find((r) => r.id === id); }
  all(): T[] { return this.rows.slice(); }
}
const r = new MemRepo<{ id: number; name: string }>();
r.add({ id: 1, name: "a" });
console.log(r.get(1)?.name, r.all().length);
`,
  },
  {
    id: "c304-ex-arrow-return-type",
    title: "箭头函数的返回类型标注（带对象与联合）",
    src: `
const f = (n: number): { doubled: number } => ({ doubled: n * 2 });
const g = (n: number): number | string => (n > 0 ? n : "neg");
console.log(f(2).doubled, g(1), g(-1));
const h = (): void => { console.log("void-arrow"); };
h();
`,
  },
  {
    id: "c304-ex-generic-arrow-in-generic-call",
    title: "泛型箭头当实参传给泛型函数",
    src: `
function apply<T, R>(v: T, f: (x: T) => R): R { return f(v); }
const r = apply<number, string>(3, (x) => "n" + x);
console.log(r);
console.log(apply("s", (x) => x.length));
`,
  },
  {
    id: "c304-ex-as-expression-in-condition",
    title: "`as` 出现在条件与逻辑表达式里",
    src: `
const raw: unknown = "5";
if ((raw as string).length > 0) console.log("nonempty", (raw as string).toUpperCase());
const n = Number(raw as string);
console.log(n, (n as number) > 1 && (raw as string).startsWith("5"));
`,
  },
  {
    id: "c304-ex-typeof-value-in-type-position",
    title: "`typeof` 同时出现在值位与类型位",
    src: `
const cfg = { a: 1, b: "s" };
type Cfg = typeof cfg;
type Keys = keyof Cfg;
const k: Keys = "a";
console.log(typeof cfg, k in cfg, cfg[k]);
const t: typeof cfg.b = "x";
console.log(t, typeof t);
`,
  },
  {
    id: "c304-ex-keyof-generic-constraint",
    title: "keyof 当泛型约束，运行期按下标取",
    src: `
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const row = { id: 1, name: "kim" };
console.log(pluck(row, "id"), pluck(row, "name"));
`,
  },
  {
    id: "c304-ex-indexed-access-type-value",
    title: "索引访问类型 T[K] 与实际下标读并存",
    src: `
type Person = { name: string; age: number };
type NameType = Person["name"];
const key: keyof Person = "age";
const p: Person = { name: "a", age: 2 };
const v: NameType = "b";
const n: Person["age"] = p[key] as number;
console.log(v, n);
`,
  },
  {
    id: "c304-ex-mapped-type-keyof-value",
    title: "映射类型 + keyof：只擦类型，值照跑",
    src: `
type Flags<T> = { [K in keyof T]: boolean };
const flags: Flags<{ a: number; b: string }> = { a: true, b: false };
console.log(flags.a, flags.b, Object.keys(flags).join(","));
`,
  },
  {
    id: "c304-ex-conditional-distributive-value",
    title: "分配式条件类型与运行期判断同形",
    src: `
type IsArray<T> = T extends any[] ? "yes" : "no";
type R1 = IsArray<number[]>;
type R2 = IsArray<number>;
function check(v: unknown): string { return Array.isArray(v) ? "yes" : "no"; }
const a: R1 = "yes";
const b: R2 = "no";
console.log(a, b, check([1]), check(1));
`,
  },
  {
    id: "c304-ex-function-overload-union",
    title: "函数重载签名 + 联合实现",
    src: `
function fmt(v: number): string;
function fmt(v: string): string;
function fmt(v: boolean): string;
function fmt(v: number | string | boolean): string {
  return typeof v + ":" + String(v);
}
console.log(fmt(1), fmt("a"), fmt(true));
`,
  },
  {
    id: "c304-ex-abstract-property",
    title: "抽象属性由子类用字段实现",
    src: `
abstract class Node3 {
  abstract id: number;
  abstract label: string;
  show(): string { return this.id + ":" + this.label; }
}
class Leaf extends Node3 {
  id = 1;
  label = "leaf";
}
console.log(new Leaf().show());
`,
  },
  {
    id: "c304-ex-optional-method-in-interface",
    title: "接口里的可选方法与值侧的可选调用",
    src: `
interface Logger { log?(msg: string): void; name: string }
const quiet: Logger = { name: "quiet" };
const loud: Logger = { name: "loud", log: (m) => console.log("LOG", m) };
quiet.log?.("a");
loud.log?.("b");
console.log(quiet.name, loud.name);
`,
  },
  {
    id: "c304-ex-type-alias-fn-value",
    title: "函数类型别名既当标注又当值用",
    src: `
type Mapper = (s: string) => number;
const len: Mapper = (s) => s.length;
const runner: Mapper = function (s) { return s.length * 2; };
console.log(len("abc"), runner("ab"));
`,
  },
  {
    id: "c304-ex-tuple-labeled",
    title: "带标签的元组类型只是类型",
    src: `
type Pair = [first: number, second: string];
const p: Pair = [1, "a"];
const q: [x: number, y: number] = [2, 3];
console.log(p[0], p[1], q[0] + q[1], p.length);
`,
  },
  {
    id: "c304-ex-enum-const-in-class",
    title: "const 枚举当类字段的初始值",
    src: `
const enum Level { Low = 1, High = 10 }
class Threshold {
  level: Level = Level.High;
  isHigh(): boolean { return this.level === Level.High; }
}
const t = new Threshold();
console.log(t.level, t.isHigh());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-namespace-export-type-only",
    title: "命名空间里只有类型：那个名字运行期不存在",
    src: `
namespace Types {
  export type Id = number;
  export interface Row { id: Id }
}
const n: Types.Row = { id: 1 };

namespace Mixed {
  export type T = string;
  export const value = 42;
}
console.log(n.id, Mixed.value, JSON.stringify(Mixed));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-assertion-in-arrow",
    title: "断言与箭头挤在一行",
    src: `
const f = (v: unknown) => (v as string).trim();
const g = <T,>(v: T) => v as unknown as string;
console.log(f("  x  "), g("y"));
const arr = [1, 2] as number[];
console.log(arr.map((n) => (n as number) + 1).join(","));
`,
  },
  {
    id: "c304-ex-parameter-property-optional",
    title: "参数属性 + 可选形参 + 默认值混用",
    src: `
class Req {
  constructor(public url: string, public method = "GET", public body?: string) {}
  show(): string { return this.url + " " + this.method + " " + (this.body ?? "-"); }
}
console.log(new Req("/a").show(), new Req("/b", "POST", "x").show());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c304-ex-generic-class-static-and-field",
    title: "泛型类的静态成员与实例字段",
    src: `
class Stack<T> {
  static created = 0;
  private items: T[] = [];
  constructor() { Stack.created += 1; }
  push(v: T): this { this.items.push(v); return this; }
  pop(): T | undefined { return this.items.pop(); }
  get size(): number { return this.items.length; }
}
const s = new Stack<number>().push(1).push(2);
console.log(s.pop(), s.size, Stack.created);
`,
  },
  {
    id: "c304-ex-as-in-return-and-throw",
    title: "`as` 落在 return 与 throw 的表达式里",
    src: `
function parse(s: string): number {
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error("bad: " + s) as Error;
  return n as number;
}
console.log(parse("3"));
try {
  parse("x");
} catch (e: any) {
  console.log(e.message);
}
`,
  },
  {
    id: "c304-ex-type-annotation-in-catch-and-loop",
    title: "catch 形参与 for 头部里的类型标注",
    src: `
const rows: Array<{ id: number }> = [{ id: 1 }, { id: 2 }];
let sum: number = 0;
for (const row of rows as Array<{ id: number }>) sum += row.id;
for (let i: number = 0; i < 2; i++) sum += i;
for (const k in { a: 1, b: 2 }) sum += k.length;
try {
  throw new TypeError("t");
} catch (e: unknown) {
  sum += (e as Error).message.length;
}
console.log(sum);
`,
  },

  // ===== 第 305 轮：加宽矩阵（44 条）=====

  {
    id: "c305-ex-async-generator-declaration",
    title: "`async function*` 声明 + `for await..of`",
    src: `
async function* range(n: number): AsyncGenerator<number> {
  for (let i = 0; i < n; i++) yield i;
}
async function main() {
  const out: number[] = [];
  for await (const v of range(3)) out.push(v);
  console.log(out.join(","));
}
main();
`,
  },
  {
    id: "c305-ex-async-generator-method-in-class",
    title: "类里的 `async *items()` 方法",
    src: `
class Stream {
  #base = 10;
  async *items(): AsyncGenerator<number> {
    yield this.#base;
    yield this.#base + 1;
  }
}
async function main() {
  const out: number[] = [];
  for await (const v of new Stream().items()) out.push(v);
  console.log(out.join(","));
}
main();
`,
  },
  {
    id: "c305-ex-async-generator-interface-type",
    title: "异步迭代器的类型标注（`AsyncIterable` / `Symbol.asyncIterator`）",
    src: `
async function* g(): AsyncGenerator<number> { yield 1; }
const it: AsyncIterable<number> = g();
console.log(typeof (it as any)[Symbol.asyncIterator], typeof (it as any).next);
`,
  },
  {
    id: "c305-ex-for-await-of-array",
    title: "`for await..of` 一个普通字符串数组",
    src: `
async function main() {
  const out: string[] = [];
  for await (const v of ["a", "b"]) out.push(v);
  console.log(out.join("-"));
}
main();
`,
  },
  {
    id: "c305-ex-for-await-of-map-entries",
    title: "`for await..of` 一个 `Map` 的 entries，并解构",
    src: `
async function main() {
  const m = new Map<string, number>([["a", 1], ["b", 2]]);
  const out: string[] = [];
  for await (const [k, v] of m) out.push(k + "=" + v);
  console.log(out.join(","));
}
main();
`,
  },
  {
    id: "c305-ex-declare-namespace-and-value",
    title: "`declare namespace` 整块擦掉，旁边那句照跑",
    src: `
declare namespace D {
  const x: number;
  function f(): void;
}
console.log("declared", typeof (globalThis as any).D);
`,
  },
  {
    id: "c305-ex-namespace-enum-and-const-value",
    title: "命名空间里同时有 `enum` 与引用它的 `const`",
    src: `
namespace Outer {
  export enum E { A = 1, B = 2 }
  export const v = E.A + 10;
}
console.log(Outer.v, Outer.E.A, Outer.E[2]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-nonnull-on-call-result",
    title: "非空断言落在调用结果上（`maybe()!.length`）",
    src: `
function maybe(): string | null { return "xyz"; }
console.log(maybe()!.length, maybe()?.length, maybe()!.toUpperCase());
`,
  },
  {
    id: "c305-ex-as-on-call-result-chain",
    title: "`as` 落在调用结果与后续成员链上",
    src: `
const f = () => ({ a: 1, b: { c: 2 } });
console.log((f() as { a: number }).a, (f() as any).b.c, (f() as any).b["c"]);
`,
  },
  {
    id: "c305-ex-static-block-with-try-catch",
    title: "静态块里写 `try/catch`",
    src: `
class C {
  static v: number;
  static {
    try {
      throw new Error("x");
    } catch {
      C.v = 2;
    }
  }
}
console.log(C.v);
`,
  },
  {
    id: "c305-ex-static-computed-key-and-method",
    title: "静态计算键字段 + 实例计算键方法",
    src: `
const KEY = "kind";
class C {
  static [KEY] = "c";
  [KEY](): string { return "m"; }
}
console.log(C.kind, new C().kind());
`,
  },
  {
    id: "c305-ex-class-field-reserved-names",
    title: "字段名用保留字（`static default` / `null`）",
    src: `
class C {
  static default = 1;
  null = 2;
}
console.log(C.default, new C().null);
`,
  },
  {
    id: "c305-ex-abstract-getter-implemented",
    title: "抽象类里的抽象 getter，子类实现它",
    src: `
abstract class Base {
  abstract get value(): number;
}
class Impl extends Base {
  get value(): number { return 42; }
}
console.log(new Impl().value);
`,
  },
  {
    id: "c305-ex-generic-class-private-field",
    title: "泛型类 + 私有字段 + 泛型 getter",
    src: `
class Box<T> {
  #v: T;
  constructor(v: T) { this.#v = v; }
  get value(): T { return this.#v; }
}
console.log(new Box(5).value, new Box("s").value, new Box([1, 2]).value.length);
`,
  },
  {
    id: "c305-ex-tuple-rest-element",
    title: "带剩余元素的元组类型 + 解构",
    src: `
type T = [string, ...number[]];
const t: T = ["a", 1, 2];
const [head, ...tail] = t;
console.log(head, tail.join(","), t.length);
`,
  },
  {
    id: "c305-ex-catch-unknown-narrowing",
    title: "`catch (e: unknown)` 加 `instanceof` 收窄",
    src: `
try {
  throw new Error("x");
} catch (e: unknown) {
  if (e instanceof Error) console.log("msg", e.message);
  else console.log("other");
}
`,
  },
  {
    id: "c305-ex-class-method-overloads",
    title: "类里方法的重载签名 + 一个实现",
    src: `
class Util {
  parse(v: string): number;
  parse(v: number): number;
  parse(v: any): number { return typeof v === "string" ? v.length : v; }
}
console.log(new Util().parse("abc"), new Util().parse(7));
`,
  },
  {
    id: "c305-ex-destructure-assign-to-members",
    title: "解构赋值写进成员位（`({ a: o.x } = src)`）",
    src: `
const o: any = {};
const src = { a: 1, b: 2 };
({ a: o.x, b: o.y } = src);
console.log(o.x, o.y);
`,
  },
  {
    id: "c305-ex-type-alias-function-value",
    title: "函数类型的别名当标注用",
    src: `
type Fn = (n: number) => number;
const double: Fn = (n) => n * 2;
const use = (f: Fn, v: number) => f(v);
console.log(double(21), use(double, 4));
`,
  },
  {
    id: "c305-ex-computed-optional-chain-index",
    title: "计算成员位上的可选链（`o?.list?.[1]`）",
    src: `
const o: any = { list: [1, 2, 3] };
console.log(o?.list?.[1], o.list?.[5], o?.missing?.[0]);
`,
  },
  {
    id: "c305-ex-enum-as-object-key",
    title: "用枚举值当对象的计算键",
    src: `
enum Color { Red, Green }
const names: Record<number, string> = { [Color.Red]: "red", [Color.Green]: "green" };
console.log(names[Color.Red], names[Color.Green], Color[1]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-readonly-class-property-init",
    title: "`readonly` 字段在构造函数里赋值",
    src: `
class P {
  readonly id: number;
  name: string;
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}
const p = new P(1, "a");
console.log(p.id, p.name, Object.keys(p).join(","));
`,
  },
  {
    id: "c305-ex-definite-assignment-field",
    title: "明确赋值断言字段（`v!: number`）在构造函数里补上",
    src: `
class C {
  v!: number;
  constructor() { this.init(); }
  init() { this.v = 5; }
}
console.log(new C().v);
`,
  },
  {
    id: "c305-ex-generic-default-type-param-class",
    title: "泛型类带默认类型实参",
    src: `
class Holder<T = string> {
  constructor(public value: T) {}
}
console.log(new Holder("a").value, new Holder<number>(2).value);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-interface-extends-multiple",
    title: "接口继承多个接口，类实现它",
    src: `
interface A { a: number; }
interface B { b: string; }
interface C extends A, B { c: boolean; }
class Impl implements C {
  a = 1;
  b = "x";
  c = true;
}
const v: C = new Impl();
console.log(v.a, v.b, v.c);
`,
  },
  {
    id: "c305-ex-type-assertion-in-call-args",
    title: "实参位上的 `as` 与尖括号之外的两种断言形状",
    src: `
function take(v: unknown): string { return typeof v; }
console.log(take(1 as unknown), take("s" as unknown), take(({ a: 1 } as unknown)));
`,
  },
  {
    id: "c305-ex-optional-chain-nonnull-mix",
    title: "可选链与非空断言混在同一条链上",
    src: `
const o: any = { a: { b: 1 } };
console.log(o?.a!.b, o.a?.b, o?.a?.b, o?.a!.b! + 1);
`,
  },
  {
    id: "c305-ex-class-expression-extends-generic",
    title: "类表达式 `extends` 一个泛型基类",
    src: `
class Base<T> {
  constructor(public value: T) {}
  get(): T { return this.value; }
}
const Sub = class extends Base<number> {
  double(): number { return this.value * 2; }
};
const s = new Sub(3);
console.log(s.get(), s.double(), s instanceof Base);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-arrow-typed-params-immediately-called",
    title: "带类型标注的箭头函数立即调用（括号那两种形状）",
    src: `
console.log(((a: number, b: number) => a + b)(1, 2));
const add = (a: number, b: number): number => a + b;
console.log(add(3, 4));
console.log(((x: string) => x.toUpperCase())("ab"));
`,
  },
  {
    id: "c305-ex-var-in-block-and-function-scope",
    title: "`var` 在块里声明、在块外可见（函数作用域）",
    src: `
function f(): string {
  if (true) { var inside = 1; }
  return "v" + inside;
}
console.log(f());
`,
  },
  {
    id: "c305-ex-function-overload-union-param",
    title: "重载声明的实参联合类型",
    src: `
function fmt(v: string): string;
function fmt(v: number): string;
function fmt(v: any): string { return typeof v === "string" ? "s:" + v : "n:" + v; }
console.log(fmt("a"), fmt(1));
`,
  },
  {
    id: "c305-ex-satisfies-preserves-literal",
    title: "`satisfies` 不影响运行期值（只是形状检查）",
    src: `
const conf = { mode: "dev", retries: 3 } satisfies { mode: string; retries: number };
console.log(conf.mode, conf.retries, JSON.stringify(conf));
`,
  },
  {
    id: "c305-ex-mapped-type-over-union",
    title: "映射类型只在类型位（运行期一个指令都不产生）",
    src: `
type Flags<T> = { [K in keyof T]: boolean };
type Person = { name: string; age: number };
const f: Flags<Person> = { name: true, age: false };
console.log(JSON.stringify(f));
`,
  },
  {
    id: "c305-ex-conditional-type-with-infer-value",
    title: "带 `infer` 的条件类型只擦掉、值照跑",
    src: `
type ElementOf<T> = T extends (infer U)[] ? U : never;
const xs: ElementOf<number[]> = 1;
console.log(xs + 1);
`,
  },
  {
    id: "c305-ex-template-literal-type-value",
    title: "模板字面量类型（类型位）+ 同形的一个运行期模板串",
    src: "\ntype Greeting = `hello ${string}`;\nconst g = \"hello world\";\nconst t: Greeting = g;\nconsole.log(t, t.length);\n",
  },
  {
    id: "c305-ex-keyof-typeof-value-usage",
    title: "`keyof typeof` 取出来的键在运行期读属性",
    src: `
const shapes = { circle: 1, square: 2 };
type ShapeKey = keyof typeof shapes;
const k: ShapeKey = "circle";
console.log(shapes[k], shapes.square);
`,
  },
  {
    id: "c305-ex-index-signature-object-iteration",
    title: "索引签名对象的遍历",
    src: `
interface Dict { [key: string]: number }
const d: Dict = { a: 1, b: 2 };
let total = 0;
for (const k of Object.keys(d)) total += d[k];
console.log(total, Object.keys(d).join(","));
`,
  },
  {
    id: "c305-ex-abstract-class-with-protected-members",
    title: "抽象类的 `protected` 成员在子类里用",
    src: `
abstract class Base {
  protected label = "base";
  abstract run(): string;
  describe(): string { return this.label + ":" + this.run(); }
}
class Impl extends Base {
  run(): string { return "impl"; }
}
console.log(new Impl().describe());
`,
  },
  {
    id: "c305-ex-parameter-property-optional-and-readonly",
    title: "参数属性：`readonly` 与可选一起用",
    src: `
class P {
  constructor(readonly id: number, private tag?: string) {}
  get(): string { return this.id + "/" + (this.tag ?? "none"); }
}
console.log(new P(1).get(), new P(2, "t").get(), Object.keys(new P(3)).join(","));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-namespace-export-function-and-const",
    title: "命名空间导出函数与常量，再从外面调用",
    src: `
namespace Util {
  export const base = 10;
  export function add(n: number): number { return n + base; }
}
console.log(Util.add(1), Util.base, typeof Util);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-declare-const-and-function-erased",
    title: "`declare const` / `declare function` 整条擦掉",
    src: `
declare const VERSION: string;
declare function nativeFn(x: number): number;
console.log("erased", typeof VERSION);
`,
  },
  {
    id: "c305-ex-enum-const-folding-values",
    title: "`const enum` 的成员在运行期是普通对象上的属性",
    src: `
const enum Level { Low = 1, High = 2 }
console.log(Level.Low, Level.High, Level[1]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c305-ex-type-predicate-arrow-callback",
    title: "类型谓词箭头当 `filter` 回调",
    src: `
const xs: (string | null)[] = ["a", null, "b"];
const isStr = (v: string | null): v is string => typeof v === "string";
console.log(xs.filter(isStr).join(","));
`,
  },
  {
    id: "c305-ex-never-void-unknown-values",
    title: "`never` / `void` / `unknown` 标注下的值照跑",
    src: `
function fail(): never { throw new Error("nope"); }
function nothing(): void { console.log("void fn"); }
let u: unknown = 5;
nothing();
try { fail(); } catch (e) { console.log("caught"); }
console.log(typeof u, (u as number) + 1);
`,
  },

  // ===== 第 320 轮：生成器那两族的接口 ===== 

  {
    id: "c320-ex-generator-interface-shapes",
    title: "生成器的两条接口：同步那族有 `Symbol.iterator`、异步那族两个都有",
    src: "\nfunction* sync(): Generator<number> { yield 1; }\nasync function* asy(): AsyncGenerator<number> { yield 2; }\nconst s: any = sync();\nconst a: any = asy();\nconsole.log(typeof s[Symbol.iterator], typeof s[Symbol.asyncIterator]);\nconsole.log(typeof a[Symbol.iterator], typeof a[Symbol.asyncIterator]);\nconsole.log(s[Symbol.iterator]() === s, a[Symbol.asyncIterator]() === a);\n",
  },

  // ===== 第 321 轮：标签模板当操作数 =====

  {
    id: "c321-ex-tagged-template-as-operand",
    title: "标签模板出现在二元 / 实参位时，标签与模板不能被拆开",
    src: "\nconst t = (s: any, ...v: any[]) => s[0] + v.join(\"\");\nconsole.log(t`abc`.length, 1 + t`xy`.length, t`a${1}b`.toUpperCase());\nconsole.log(2 * t`q`.length);\nconsole.log([t`m`, t`n`].join(\"-\"));\n",
  },
  {
    id: "c321-ex-tagged-template-after-unary",
    title: "标签模板出现在一元运算符的操作数位（`typeof t`z``）",
    src: "\nconst t = (s: any, ...v: any[]) => s[0] + v.join(\"\");\nconsole.log(typeof t`z`);\nconsole.log(!t``);\n",
  },

  // ============ 第 323 轮加宽：24 条 ============
  {
    id: "c323-ex-computed-class-field-names",
    title: "类字段的计算名（实例与静态各一格）",
    src: `
const KEY = "value";
class Box {
  [KEY] = 1;
  ["static" + "Key"] = 2;
}
const b = new Box();
console.log(b.value, (b as any).staticKey, Object.keys(b).sort().join(","));
`,
  },
  {
    id: "c323-ex-static-computed-field",
    title: "静态计算名字段：类上可读、实例上不可读",
    src: `
const KEY = "count";
function makeKey() { return KEY; }
class Counter {
  static [makeKey()] = 10;
  static [KEY + "_next"] = 11;
}
console.log((Counter as any).count, (Counter as any).count_next, (new Counter() as any).count);
`,
  },
  {
    id: "c323-ex-angle-bracket-assertion-forms",
    title: "尖括号断言：变量、字面量、嵌套三格",
    src: `
const a: unknown = "x";
const b = <string>a;
const c = <any>(1 as any) + 1;
console.log(b, c, (<number>(2 as any)) * 3);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-super-property-write",
    title: "super 上的写：落在当前实例上，起点是父原型",
    src: `
class Base { value = 1; }
class Sub extends Base {
  set value(v: number) { super.value = v * 2; }
  get value() { return super.value + 1; }
}
const s = new Sub();
s.value = 5;
console.log(s.value);
`,
  },
  {
    id: "c323-ex-class-expression-name-in-body",
    title: "具名类表达式的名字在类体与静态初始化里可见",
    src: `
const K = class Named {
  static id = "n1";
  get tag() { return Named.id; }
  static make() { return new Named(); }
};
console.log(K.id, new K().tag, K.make() instanceof K);
`,
  },
  {
    id: "c323-ex-named-function-expression",
    title: "具名函数表达式的名字在函数体内可见（可递归）",
    src: `
const fact = function self(n: number): number { return n <= 1 ? 1 : n * self(n - 1); };
console.log(fact(5), typeof (fact as any).self);
`,
  },
  {
    id: "c323-ex-parameter-properties",
    title: "参数属性：进构造函数就挂在实例上",
    src: `
class Point {
  constructor(public x: number, private y: number, readonly z = 3) {}
  sum() { return this.x + this.y + this.z; }
}
const p = new Point(1, 2);
console.log(p.x, p.sum(), Object.keys(p).join(","));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-optional-call-forms",
    title: "可选调用的三种基名：null、缺方法、接收者为 null",
    src: `
const o: any = { m() { return "m"; }, n: { k() { return "k"; } } };
const f: any = null;
console.log(o.m?.(), o.n?.k?.(), o.missing?.(), f?.());
`,
  },
  {
    id: "c323-ex-nonnull-in-chains",
    title: "非空断言与下标 / 成员混在同一条链上",
    src: `
const arr: any = [[1, 2]];
console.log(arr![0]![0]);
const o: any = { a: { b: [7] } };
console.log(o!.a!.b![0], o?.a.b![0]);
`,
  },
  {
    id: "c323-ex-generics-erased-forms",
    title: "泛型的运行期：类型参数一律擦除，函数体照跑",
    src: `
function first<T>(xs: T[]): T { return xs[0]; }
function pair<A, B>(a: A, b: B): [A, B] { return [a, b]; }
class Box<T> { constructor(public value: T) {} get(): T { return this.value; } }
console.log(first<number>([1, 2]), pair("a", 1).join(":"), new Box<string>("v").get());
interface Wrap<T> { value: T }
const w: Wrap<number> = { value: 3 };
console.log(w.value);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-abstract-and-overrides",
    title: "抽象类：抽象方法与字段在子类上落地",
    src: `
abstract class Shape {
  abstract area(): number;
  name = "shape";
  describe() { return this.name + ":" + this.area(); }
}
class Sq extends Shape {
  name = "sq";
  constructor(private side: number) { super(); }
  area() { return this.side * this.side; }
}
console.log(new Sq(3).describe());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-interface-and-type-erasure",
    title: "interface / type / declare：一个运行期指令都不产生",
    src: `
interface Opts { n: number; s?: string }
type Alias = Opts & { extra: boolean };
declare const ghost: number;
const f = (o: Opts): string => o.n + (o.s ?? "-");
console.log(f({ n: 1 }), f({ n: 2, s: "x" }));
`,
  },
  {
    id: "c323-ex-satisfies-and-as-const",
    title: "satisfies 与 as const：值本身照原样留下",
    src: `
const cfg = { mode: "fast", retries: 3 } satisfies { mode: string; retries: number };
const modes = ["a", "b"] as const;
console.log(cfg.mode, cfg.retries, modes.length, modes[0]);
`,
  },
  {
    id: "c323-ex-function-overloads",
    title: "函数重载：实现体是唯一跑的那一份",
    src: `
function fmt(v: number): string;
function fmt(v: string): string;
function fmt(v: any): string { return typeof v === "number" ? v.toFixed(2) : v.toUpperCase(); }
console.log(fmt(1.5), fmt("ab"));
`,
  },
  {
    id: "c323-ex-namespace-with-values",
    title: "namespace 带值：导出常量与函数",
    src: `
namespace Math2 {
  export const PI2 = 6;
  export function twice(n: number) { return n * 2; }
}
console.log(Math2.PI2, Math2.twice(21));
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-enum-runtime-forms",
    title: "enum 的运行期：正向、反向映射、字符串枚举",
    src: `
enum Color { Red, Green = 5, Blue }
enum Name { A = "a", B = "b" }
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[0]);
console.log(Name.A, Name.B, (Name as any)[0]);
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-namespace-merged-function",
    title: "函数与命名空间合并：静态格挂在函数值自己身上",
    src: `
function make(n: number) { return n * 2; }
namespace make {
  export const version = "1.0";
  export function help() { return "help:" + version; }
}
console.log(make(3), make.version, make.help());
`,
    nodeArgs: ["--experimental-transform-types"],
  },
  {
    id: "c323-ex-decorator-free-mixins",
    title: "混入模式：类表达式与 Object.assign 组合",
    src: `
type Ctor = new (...args: any[]) => any;
function Tagged<T extends Ctor>(Base: T) {
  return class extends Base { tag = "t"; };
}
class Plain { v = 1; }
const Mixed = Tagged(Plain);
const m = new Mixed();
console.log(m.tag, m.v, m instanceof Plain);
`,
  },
  {
    id: "c323-ex-arrow-generic-and-iife",
    title: "泛型箭头与带类型标注的立即调用",
    src: `
const id = <T,>(v: T): T => v;
console.log(id("x"), ((a: number, b: number) => a + b)(1, 2));
console.log(((a: string) => a.toUpperCase())("ab"));
`,
  },
  {
    id: "c323-ex-destructuring-in-many-slots",
    title: "解构落在形参 / for..of 头 / catch / 赋值四种位置上",
    src: `
function f({ a, b = 2 }: { a: number; b?: number }) { return a + b; }
for (const [k, v] of [["x", 1] as [string, number]]) console.log(k, v);
try { throw { code: 7 }; } catch ({ code }) { console.log(code); }
let p = 0, q = 0;
[p, q] = [1, 2];
console.log(f({ a: 1 }), p, q);
`,
  },
  {
    id: "c323-ex-union-narrowing-runtime",
    title: "联合类型的收窄写法：typeof / in / instanceof 三种守卫",
    src: `
function show(v: string | number): string { return typeof v === "string" ? v.toUpperCase() : v.toFixed(1); }
function has(o: { a?: number } | { b?: number }) { return "a" in o ? "A" : "B"; }
class E1 {} class E2 {}
function kind(v: E1 | E2) { return v instanceof E1 ? "e1" : "e2"; }
console.log(show("a"), show(1), has({ a: 1 }), has({ b: 2 }), kind(new E1()), kind(new E2()));
`,
  },
  {
    id: "c323-ex-optional-and-readonly-members",
    title: "可选成员与只读成员的读法：只影响类型、不影响运行期",
    src: `
interface Cfg { readonly host: string; port?: number }
const c: Cfg = { host: "h" };
console.log(c.host, c.port, "port" in c, Object.keys(c).join(","));
`,
  },
  {
    id: "c323-ex-import-type-and-export-erased",
    title: "import type / export type / export 声明：单文件里都不产生运行期东西",
    src: `
type Local = { n: number };
const v: Local = { n: 1 };
console.log(v.n);
`,
  },
  {
    id: "c323-ex-private-members-forms",
    title: "私有字段与私有方法：实例 / 静态 / 访问器",
    src: `
class Vault {
  #secret = 1;
  static #shared = 2;
  #read() { return this.#secret + Vault.#shared; }
  get total() { return this.#read(); }
  static get shared() { return Vault.#shared; }
}
const v = new Vault();
console.log(v.total, Vault.shared, Object.keys(v).length);
`,
  },
  // ===== 第 330 轮收编（10 条）=====
  {
    id: "c330-ex-type-import-erased",
    title: "只带类型的 import 一行都不产生运行期东西",
    src: `
type Shape = { area(): number };
interface Named { name: string }
const s: Shape = { area: () => 4 };
const n: Named = { name: "box" };
console.log(s.area(), n.name);
`,
  },
  {
    id: "c330-ex-declare-const-erased",
    title: "`declare const` 与 `declare function` 整条擦掉",
    src: `
declare const INJECTED: number;
declare function injected(): string;
console.log(typeof INJECTED, typeof injected);
`,
  },
  {
    id: "c330-ex-generic-class-statics",
    title: "泛型类的静态成员与实例字段",
    src: `
class Box<T> {
  static count = 0;
  value: T;
  constructor(value: T) {
    this.value = value;
    Box.count = Box.count + 1;
  }
  map<U>(fn: (value: T) => U): Box<U> {
    return new Box<U>(fn(this.value));
  }
}
const one = new Box<number>(2);
const two = one.map((n) => String(n * 3));
console.log(one.value, two.value, Box.count);
`,
  },
  {
    id: "c330-ex-abstract-instantiation",
    title: "抽象类：子类能造、抽象方法被子类实现",
    src: `
abstract class Shape {
  abstract area(): number;
  describe(): string {
    return this.constructor.name + ":" + this.area();
  }
}
class Square extends Shape {
  side: number;
  constructor(side: number) {
    super();
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
}
console.log(new Square(3).describe());
`,
  },
  {
    id: "c330-ex-enum-const-and-object",
    title: "`const enum` 的成员在运行期就是一个数",
    nodeArgs: ["--experimental-transform-types"],
    src: `
const enum Level { Low = 1, Mid = 5, High = 10 }
function score(level: Level): number {
  return level * 2;
}
console.log(score(Level.Mid), Level.High);
`,
  },
  {
    id: "c330-ex-overload-implementation",
    title: "重载签名 + 实现体：运行期只留实现那一份",
    src: `
function size(value: string): number;
function size(value: number[]): number;
function size(value: string | number[]): number {
  return value.length;
}
console.log(size("abcd"), size([1, 2, 3]));
`,
  },
  {
    id: "c330-ex-type-predicate-fn",
    title: "类型谓词函数：运行期就是一个返回布尔的函数",
    src: `
function isString(value: unknown): value is string {
  return typeof value === "string";
}
const items: unknown[] = ["a", 1, "b", null];
console.log(items.filter(isString).join(","));
console.log(isString("x"), isString(1));
`,
  },
  {
    id: "c330-ex-nonnull-assertion-forms",
    title: "非空断言在三种位置上的取值",
    src: `
const data: { items?: { id: number }[] } = { items: [{ id: 7 }] };
console.log(data.items![0]!.id);
const maybe: string | null = "hi";
console.log(maybe!.length);
`,
  },
  {
    id: "c330-ex-satisfies-forms",
    title: "`satisfies` 不改值：对象、数组与函数",
    src: `
const config = { port: 8080, host: "local" } satisfies { port: number; host: string };
console.log(config.port, config.host);
const list = [1, 2, 3] satisfies number[];
console.log(list.length, list[1]);
`,
  },
  {
    id: "c330-ex-optional-chain-loops",
    title: "可选链在循环与调用实参位上",
    src: `
const rows: { name?: string; tags?: string[] }[] = [{ name: "a", tags: ["x"] }, {}, { name: "c" }];
for (const row of rows) {
  console.log(row.name ?? "-", row.tags?.length ?? 0);
}
const box: { get?(): number } = {};
console.log(box.get?.() ?? -1, box.get?.());
`,
  },
  // ===== 第 331 轮收编（8 条）=====
  {
    id: "c331-ex-interface-and-type-erasure",
    title: "类型位整片擦除：interface / type / declare",
    src: `
interface Point { x: number; y: number }
type Pair<T> = [T, T];
declare const injected: number;
function origin(): Point {
  return { x: 0, y: 0 };
}
const pair: Pair<string> = ["a", "b"];
console.log(origin().x, pair.join("-"), typeof injected);
`,
  },
  {
    id: "c331-ex-generic-constraints-and-defaults",
    title: "泛型的约束与默认值在运行期一行都不产生",
    src: `
class Container<T extends { id: number } = { id: number }> {
  items: T[] = [];
  add(item: T): void {
    this.items.push(item);
  }
  ids(): number[] {
    return this.items.map((item) => item.id);
  }
}
const box = new Container();
box.add({ id: 3 });
box.add({ id: 4 });
console.log(box.ids().join(","), box.items.length);
`,
  },
  {
    id: "c331-ex-enum-and-namespace-merge",
    title: "`enum` 与 `namespace` 合并（运行期两个都在）",
    nodeArgs: ["--experimental-transform-types"],
    src: `
enum Level { Low = 1, High = 2 }
namespace Level {
  export function label(value: Level): string {
    return value === Level.Low ? "low" : "high";
  }
}
console.log(Level.Low, Level.High, Level.label(Level.High), Level[1]);
`,
  },
  {
    id: "c331-ex-class-modifiers-erased",
    title: "类上的修饰词与实现子句：运行期只见成员",
    src: `
interface Named { name: string }
abstract class Base implements Named {
  abstract kind(): string;
  name = "base";
}
class Kid extends Base {
  kind(): string {
    return "kid";
  }
}
const kid: Base = new Kid();
console.log(kid.kind(), kid.name, kid instanceof Base, kid instanceof Kid);
`,
  },
  {
    id: "c331-ex-optional-and-rest-params",
    title: "可选参数、默认值与剩余参数一起用",
    src: `
function tag(name: string, prefix = "#", ...rest: string[]): string {
  return prefix + name + (rest.length > 0 ? ":" + rest.join("+") : "");
}
console.log(tag("a"), tag("b", "@"), tag("c", "!", "x", "y"));
`,
  },
  {
    id: "c331-ex-destructure-params-and-defaults",
    title: "解构形参 + 默认值 + 重命名",
    src: `
function render({ title = "untitled", tags = [] as string[], meta: { width = 80 } = {} } = {}): string {
  return title + "|" + tags.join(",") + "|" + width;
}
console.log(render());
console.log(render({ title: "t", tags: ["a", "b"], meta: { width: 40 } }));
`,
  },
  {
    id: "c331-ex-satisfies-and-as-const",
    title: "`satisfies` 与 `as const` 都不改运行期的值",
    src: `
const routes = { home: "/", about: "/about" } as const;
const config = { retries: 3 } satisfies { retries: number };
console.log(routes.home, routes.about, config.retries);
console.log(Object.keys(routes).join(","));
`,
  },
  {
    id: "c331-ex-nonnull-and-optional-mix",
    title: "非空断言与可选链写在同一条取值里",
    src: `
const data: { list?: { id: number; tags?: string[] }[] } = { list: [{ id: 1, tags: ["x"] }] };
console.log(data.list![0].id, data.list![0].tags?.length);
const maybe: { run?(): number } = {};
console.log(maybe.run?.(), maybe.run?.() ?? -1);
`,
  },
  // ===== 第 333 轮收编（2 条）=====
  {
    id: "c333-ex-template-cooked-parts",
    title: "带内插的模板串：每一段都是**熟**的",
    src: `
const x = 1;
console.log(\`a\\nb\${x}\`.length, \`a\\nb\${x}\`.indexOf("\\n"));
console.log(\`c\\td\${x}e\`.length, \`\\u00e9\${x}\`.length);
console.log(\`\\x41\\u0042\${x}\`.length, \`\\u{1F600}\${x}\`.length);
console.log(\`q\\\\r\${x}\`.length);
const long = \`one
two\${x}\`;
console.log(long.length, long.indexOf("\\n") > 0);
`,
  },
  {
    id: "c333-ex-tagged-template-raw",
    title: "标签模板的 `raw` 与熟串各是各的",
    src: `
function tag(parts: any, ...rest: any[]): string {
  const raw = parts.raw;
  return raw.join("|") + "#" + parts.join("|") + "#" + rest.length;
}
console.log(tag\`c\\td\`);
console.log(tag\`a\\nb\${1}c\`);
console.log(tag\`x\${1}y\${2}z\`);
console.log(String.raw\`p\\tq\`.length, \`p\\tq\`.length);
`,
  },

  // ===== 第 371 轮：加宽矩阵收编的候选（77 条）=====
  {
    "id": "c371-ex-annotation-positions",
    "title": "类型标注在每一种位置上都被擦掉",
    "src": "const a: number = 1;\nlet b: string | null = \"s\";\nvar c: readonly number[] = [1];\nfunction f(x: number, y?: string, ...rest: boolean[]): number { return x + (y ? y.length : 0) + rest.length; }\nclass K { field: number = 1; static s: string = \"x\"; m(v: Map<string, number[]>): void {} }\nconst g = (x: number): number => x;\nconst h: (n: number) => number = (n) => n;\nfor (const v of [1, 2] as number[]) { const z: number = v; }\ntry { throw new Error(\"e\"); } catch (err: unknown) { }\nconsole.log(a, b, c.length, f(1, \"ab\", true, false), new K().field, K.s, g(2), h(3));"
  },
  {
    "id": "c371-ex-interface-and-type-alias-erased",
    "title": "interface / type 在任何值位都不产生东西",
    "src": "interface Point { x: number; y: number; m?(): string }\ntype Alias = { a: string };\ntype Fn = (x: number) => string;\ntype Union = \"a\" | \"b\" | 1;\ntype Tup = [number, string?, ...boolean[]];\ninterface Ext extends Point { z: number }\nconst p: Point = { x: 1, y: 2 };\nconst f: Fn = (n) => String(n);\nconsole.log(p.x + p.y, f(3), typeof ({} as Alias), ([\"a\"] as Union[]).length, ([1] as Tup).length);"
  },
  {
    "id": "c371-ex-generics-erased-forms",
    "title": "泛型参数、约束、默认值都被擦掉",
    "src": "function id<T>(x: T): T { return x; }\nfunction pick<T, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }\nfunction withDefault<T = string>(x: T): T { return x; }\nclass Box<T> { v: T; constructor(v: T) { this.v = v; } get(): T { return this.v; } }\nconst map = new Map<string, number>();\nmap.set(\"a\", 1);\nconst arr = new Array<number>(1, 2);\nconsole.log(id(1), id(\"s\"), pick({ a: 1 }, \"a\"), withDefault(2), new Box(\"b\").get(), map.get(\"a\"), arr.length);"
  },
  {
    "id": "c371-ex-generic-arrow-and-method",
    "title": "泛型箭头函数与泛型方法",
    "src": "const first = <T,>(xs: T[]): T => xs[0];\nconst pair = <A, B>(a: A, b: B): [A, B] => [a, b];\nclass Repo {\n  items: string[] = [];\n  add<T extends string>(x: T): this { this.items.push(x); return this; }\n  all<T>(): T[] { return this.items as unknown as T[]; }\n}\nconsole.log(first([3, 4]), pair(1, \"x\").join(\"-\"), new Repo().add(\"a\").add(\"b\").all().join(\"\"));"
  },
  {
    "id": "c371-ex-overload-signatures-erased",
    "title": "重载签名只是声明，实现体才是运行期的东西",
    "src": "function fmt(x: number): string;\nfunction fmt(x: string): string;\nfunction fmt(x: number | string): string { return typeof x === \"number\" ? \"n\" + x : \"s\" + x; }\nclass C {\n  run(x: number): string;\n  run(x: string): string;\n  run(x: any): string { return \"r\" + x; }\n}\nconsole.log(fmt(1), fmt(\"a\"), new C().run(2), new C().run(\"b\"), fmt.length);"
  },
  {
    "id": "c371-ex-declare-and-ambient-erased",
    "title": "declare 声明一律不产生运行期代码",
    "src": "declare const ambient: number;\ndeclare function ambientFn(x: number): string;\ndeclare class AmbientClass { m(): void }\ndeclare namespace AmbientNs { const v: number }\ndeclare module \"some-module\" { export const x: number }\nconst local = 1;\nconsole.log(local, typeof ambient, typeof ambientFn, typeof AmbientClass, typeof AmbientNs);"
  },
  {
    "id": "c371-ex-enum-numeric-forms",
    "title": "数值枚举：自动编号、显式值、反向映射",
    "src": "enum Color { Red, Green = 5, Blue }\nenum Flags { None = 0, A = 1 << 0, B = 1 << 1, Both = A | B }\nconst c: Color = Color.Green;\nconsole.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[0], Color[6]);\nconsole.log(Flags.A, Flags.B, Flags.Both, Flags[2], Object.keys(Color).join(\",\"));\nconsole.log(c === Color.Green);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-enum-string-and-heterogeneous",
    "title": "字符串枚举与异构枚举：只有数值那一半有反向映射",
    "src": "enum S { A = \"a\", B = \"b\" }\nenum H { N = 1, T = \"t\" }\nconsole.log(S.A, S.B, S[\"A\"], Object.keys(S).join(\",\"), S[0]);\nconsole.log(H.N, H.T, H[1], H[\"T\"], Object.keys(H).join(\",\"));\nconsole.log(S.A === \"a\", H.N === 1);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-enum-const-and-computed",
    "title": "const enum 与带常量表达式的成员",
    "src": "const enum Level { Low = 1, Mid = Low + 1, High = Mid * 2 }\nenum Computed { A = \"x\".length, B = 2 + 3, C = 1 << 4 }\nconsole.log(Level.Mid, Level.High, Computed.A, Computed.B, Computed.C, Computed[5]);\nconsole.log(Object.keys(Computed).join(\",\"));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-enum-in-class-and-function",
    "title": "枚举在有运行期语义的内层作用域里",
    "src": "enum E { A = \"a\", B = \"b\" }\nfunction pick(k: string): string { return k === \"a\" ? E.A : E.B; }\nclass Holder { tag = E.A; static all = [E.A, E.B]; m(): string { return E.B; } }\nconst arrow = (): string => E.A + E.B;\nconsole.log(pick(\"a\"), new Holder().tag, Holder.all.join(\",\"), new Holder().m(), arrow());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-namespace-with-values",
    "title": "namespace 带值：导出、内层、嵌套",
    "src": "namespace Outer {\n  export const a = 1;\n  export function f(): number { return a + 1; }\n  export namespace Inner {\n    export const b = 2;\n    export const g = (): number => b * 3;\n  }\n}\nconsole.log(Outer.a, Outer.f(), Outer.Inner.b, Outer.Inner.g());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-namespace-merging",
    "title": "namespace 与函数 / 类 / 枚举合并",
    "src": "function build(): string { return \"build\"; }\nnamespace build { export const tag = \"fn\"; }\nclass Widget { v = 1; }\nnamespace Widget { export const kind = \"cls\"; }\nenum Mode { On = 1 }\nnamespace Mode { export const label = \"mode\"; }\nconsole.log(build(), build.tag, new Widget().v, Widget.kind, Mode.On, Mode.label);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-namespace-type-only-body",
    "title": "只有类型的 namespace 体是空操作",
    "src": "namespace Types { export interface A { x: number } export type B = string; }\nnamespace Mixed { export type T = number; export const value = 7; }\nconst a: Types.A = { x: 1 };\nconst b: Types.B = \"s\";\nconsole.log(a.x, b, Mixed.value, typeof (Types as any), Object.keys(Mixed).join(\",\"));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-parameter-properties-forms",
    "title": "参数属性：public / private / protected / readonly / 可选 / 默认值",
    "src": "class Service {\n  constructor(\n    public name: string,\n    private secret: number = 3,\n    protected flag?: boolean,\n    public readonly id: string = \"x\",\n  ) {}\n  describe(): string { return this.name + this.secret + String(this.flag) + this.id; }\n}\nconst s = new Service(\"svc\");\nconsole.log(s.name, s.describe(), s.id, Object.keys(s).join(\",\"));\ns.name = \"other\";\nconsole.log(s.name);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-class-modifier-forms",
    "title": "类成员修饰符：static / readonly / override / abstract 的擦除",
    "src": "abstract class Base {\n  abstract run(): string;\n  protected helper(): string { return \"h\"; }\n  readonly tag: string = \"b\";\n  static kind = \"base\";\n  abstract get value(): number;\n}\nclass Impl extends Base {\n  override run(): string { return \"r\" + this.helper() + this.tag + Base.kind; }\n  get value(): number { return 5; }\n}\nconst i: Base = new Impl();\nconsole.log(i.run(), i.value, Base.kind, Impl.kind);"
  },
  {
    "id": "c371-ex-class-implements-and-interface",
    "title": "implements 是擦除的；接口不产生运行期值",
    "src": "interface Shape { area(): number; kind: string }\ninterface Named extends Shape { name: string }\nclass Circle implements Named {\n  kind = \"circle\";\n  constructor(public name: string, private r: number) {}\n  area(): number { return 3 * this.r * this.r; }\n}\nconst c: Named = new Circle(\"c1\", 2);\nconsole.log(c.kind, c.name, c.area(), c instanceof Circle, typeof (Shape as any));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-class-private-and-static-block",
    "title": "私有字段 / 私有方法 / 静态块 / 计算键一起上",
    "src": "class Counter {\n  #count = 0;\n  static #instances = 0;\n  static registry: Record<string, number> = {};\n  static { Counter.registry[\"init\"] = 1; }\n  constructor() { Counter.#instances = Counter.#instances + 1; }\n  #bump(by: number): number { this.#count = this.#count + by; return this.#count; }\n  get value(): number { return this.#count; }\n  static get instances(): number { return Counter.#instances; }\n  [\"dyn\" + \"amic\"](): string { return \"d\"; }\n  static has(obj: unknown): boolean { return #count in (obj as object); }\n}\nconst c = new Counter();\nconsole.log(c.value, c.dynamic(), Counter.instances, Counter.has(c), Counter.registry.init);\ntry { console.log((c as any).count); } catch (e) { console.log(\"no field\"); }"
  },
  {
    "id": "c371-ex-accessors-and-computed-keys",
    "title": "访问器 / 计算键 / 静态访问器 / 继承链上的访问器",
    "src": "const key = \"computed\";\nclass Base {\n  protected backing = 1;\n  get value(): number { return this.backing; }\n  set value(v: number) { this.backing = v * 2; }\n}\nclass Derived extends Base {\n  [key]: string = \"c\";\n  static get kind(): string { return \"derived\"; }\n  get doubled(): number { return this.value * 2; }\n}\nconst d = new Derived();\nd.value = 5;\nconsole.log(d.value, d.doubled, d.computed, Derived.kind);\nconsole.log(Object.getOwnPropertyDescriptor(Base.prototype, \"value\") !== undefined);"
  },
  {
    "id": "c371-ex-assertion-forms",
    "title": "as / 尖括号 / ! / satisfies / as const 四种断言的优先级",
    "src": "const raw: unknown = { a: { b: [1, 2] } };\nconsole.log((raw as { a: { b: number[] } }).a.b.length);\nconsole.log((<{ n: number }>{ n: 1 }).n);\nconst maybe: string | null = \"x\";\nconsole.log(maybe!.length, (maybe as string).toUpperCase());\nconst cfg = { mode: \"fast\", retries: 2 } as const;\nconst check = { mode: \"slow\", n: 1 } satisfies Record<string, unknown>;\nconsole.log(cfg.mode, cfg.retries, check.mode, check.n);\nconsole.log(((raw as any).a as { b: number[] }).b.length + 1);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-nonnull-in-chains",
    "title": "非空断言落在链的每一段上",
    "src": "const data: { a?: { b?: { c?: number[] } | null } } = { a: { b: { c: [1, 2, 3] } } };\nconsole.log(data.a!.b!.c![0]);\nconsole.log(data.a?.b?.c?.length);\nconsole.log(data!.a!.b!.c!.slice(1).length);\nconst fn: (() => { k: number }) | null = () => ({ k: 7 });\nconsole.log(fn!().k, fn?.().k);"
  },
  {
    "id": "c371-ex-optional-chain-forms",
    "title": "可选链：成员、下标、调用、与 ?? 混用",
    "src": "const o: any = { a: { b: () => ({ c: [1] }) }, n: null };\nconsole.log(o?.a?.b?.().c?.[0], o.n?.x, o.missing?.y?.z, o?.a?.b?.().c?.[9]);\nconsole.log(o.n?.[0], o[\"n\"]?.[\"0\"], o.fn?.(), o.a.b?.call?.(null).c.length);\nconst f: ((x: number) => number) | undefined = undefined;\nconsole.log(f?.(1) ?? \"none\", (o?.n ?? \"fallback\"));"
  },
  {
    "id": "c371-ex-destructuring-everywhere",
    "title": "解构：参数、默认、重命名、嵌套、rest、for-of、catch",
    "src": "function f({ a, b: { c } = { c: 0 } }: any, [x, y = 2, ...rest]: number[] = [1]): string {\n  return [a, c, x, y, rest.length].join(\",\");\n}\nconst { p, q: renamed = 5, ...others } = { p: 1, r: 2, s: 3 } as any;\nfor (const [k, v] of [[\"a\", 1], [\"b\", 2]] as [string, number][]) { }\ntry { throw { code: 7, info: { msg: \"m\" } }; } catch ({ code, info: { msg } }: any) { console.log(code, msg); }\nconsole.log(f({ a: 1, b: { c: 2 } }, [3, 4, 5]), p, renamed, JSON.stringify(others));"
  },
  {
    "id": "c371-ex-spread-forms",
    "title": "展开：调用、new、数组、对象、rest 参数",
    "src": "const xs = [1, 2, 3];\nfunction sum(...ns: number[]): number { return ns.reduce((a, b) => a + b, 0); }\nclass P { constructor(public vals: number[]) {} }\nconst obj = { a: 1, ...{ b: 2 }, ...(true ? { c: 3 } : {}) };\nconsole.log(sum(...xs), sum(...xs, 4), Math.max(...xs));\nconsole.log(new P([...xs]).vals.length, JSON.stringify([0, ...xs, 4]));\nconsole.log(JSON.stringify({ ...obj, a: 9 }), JSON.stringify({ ...xs }));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-arrow-forms",
    "title": "箭头函数的各种写法与返回值形态",
    "src": "const a = () => 1;\nconst b = (x: number) => ({ v: x });\nconst c = (x: number): number => { return x * 2; };\nconst d = async (x: number) => x + 1;\nconst e = (x: number) => (y: number) => x + y;\nconst f = <T,>(xs: T[]): number => xs.length;\nconsole.log(a(), b(1).v, c(3), e(1)(2), f([1, 2]), a.length, b.length);\nd(1).then((v) => console.log(\"async\", v));\nconst nested = () => () => () => \"deep\";\nconsole.log(nested()()());"
  },
  {
    "id": "c371-ex-template-literal-forms",
    "title": "模板串：多行、嵌套、表达式、与类型无关",
    "src": "const name = \"w\";\nconst n = 3;\nconst t = `hello ${name} #${n} ${n > 2 ? \"big\" : \"small\"}`;\nconst multi = `line1\nline2 ${1 + 1}`;\nconst nested = `a${((): string => `b${n}`)()}`;\nconsole.log(t);\nconsole.log(multi.split(\"\\n\").length, multi.split(\"\\n\")[1]);\nconsole.log(nested, `${\"x\"}`.length, ``.length === 0);"
  },
  {
    "id": "c371-ex-tagged-template-forms",
    "title": "标签模板：cooked / raw / 前后缀、返回值参与运算",
    "src": "function tag(strings: TemplateStringsArray, ...values: unknown[]): string {\n  return strings.length + \":\" + values.length + \":\" + strings.join(\"|\") + \":\" + strings.raw.join(\"|\");\n}\nconsole.log(tag`a${1}b${2}c`);\nconsole.log(tag`no-sub`);\nconsole.log(tag`x\\ny`.indexOf(\"\\\\n\") >= 0);\nfunction upper(strings: TemplateStringsArray, ...values: unknown[]): string {\n  return strings.reduce((acc, s, i) => acc + s.toUpperCase() + (i < values.length ? String(values[i]) : \"\"), \"\");\n}\nconsole.log(upper`a${1}b`.length, upper`${\"z\"}`);"
  },
  {
    "id": "c371-ex-type-only-constructs",
    "title": "条件 / 映射 / 模板字面量 / infer 类型一律擦除",
    "src": "type Cond<T> = T extends string ? \"s\" : \"n\";\ntype Mapped<T> = { [K in keyof T]?: T[K] };\ntype Ev<T> = { [K in keyof T as `get${string & K}`]: () => T[K] };\ntype Infer<T> = T extends Array<infer U> ? U : never;\ntype Tpl = `v-${number}`;\nclass Store { items: Mapped<{ a: number; b: string }> = { a: 1 }; }\nconst s = new Store();\nconsole.log(s.items.a, typeof ({} as Cond<string>), typeof (null as unknown as Infer<number[]>));"
  },
  {
    "id": "c371-ex-this-parameter-and-predicates",
    "title": "this 形参与类型谓词都是擦除的",
    "src": "function describe(this: { tag: string }, n: number): string { return this.tag + n; }\nfunction isString(v: unknown): v is string { return typeof v === \"string\"; }\nfunction assertNum(v: unknown): asserts v is number { if (typeof v !== \"number\") throw new Error(\"not num\"); }\nclass Chain { v = 1; self(this: Chain): this { return this; } }\nconsole.log(describe.call({ tag: \"t\" }, 1), isString(\"x\"), isString(1));\ntry { assertNum(\"s\"); } catch (e) { console.log((e as Error).message); }\nconsole.log(new Chain().self().v, describe.length, isString.length);"
  },
  {
    "id": "c371-ex-class-field-forms",
    "title": "类字段：初始化式、顺序、可选、确定赋值、静态块顺序",
    "src": "const log: string[] = [];\nclass Ordered {\n  static s1 = (log.push(\"s1\"), 1);\n  a = (log.push(\"a\"), 1);\n  static { log.push(\"block\"); }\n  static s2 = (log.push(\"s2\"), 2);\n  b = (log.push(\"b\"), this.a + 1);\n  c?: number;\n  d!: string;\n  constructor() { this.d = \"d\"; }\n}\nconst o = new Ordered();\nconsole.log(log.join(\",\"), o.a, o.b, o.c, o.d, Ordered.s1 + Ordered.s2);"
  },
  {
    "id": "c371-ex-super-forms",
    "title": "super：构造、方法、静态方法、访问器、属性写",
    "src": "class Base {\n  v = 1;\n  constructor(public tag: string) {}\n  get doubled(): number { return this.v * 2; }\n  m(): string { return \"base\" + this.tag; }\n  static s(): string { return \"S\"; }\n}\nclass Derived extends Base {\n  extra = 2;\n  constructor() { super(\"d\"); this.v = 3; }\n  m(): string { return super.m() + \"/derived\"; }\n  static s(): string { return super.s() + \"D\"; }\n  get total(): number { return super.doubled + this.extra; }\n}\nconst d = new Derived();\nconsole.log(d.tag, d.v, d.m(), Derived.s(), d.total);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-class-expression-forms",
    "title": "类表达式：匿名、具名自引用、extends 表达式",
    "src": "const A = class { v = 1; };\nconst B = class Named { static self(): string { return Named.name; } v = 2; };\nconst Base = class { base(): string { return \"b\"; } };\nconst C = class extends Base { extra(): string { return this.base() + \"c\"; } };\nconst pick = true;\nconst D = class extends (pick ? Base : (class {})) { };\nconsole.log(new A().v, new B().v, B.self(), new C().extra(), new D() instanceof Base);"
  },
  {
    "id": "c371-ex-new-expression-type-args",
    "title": "new 的类型实参与实参位上的断言混在一起",
    "src": "class Box<T> { constructor(public v: T) {} }\nconst b = new Box<number>(1);\nconst c = new Map<string, number>([[\"a\", 1]]);\nconst dyn = new (class { x = 5; })();\nconst fromExpr = new (b.v > 0 ? Box : Box)<string>(\"s\");\nconsole.log(b.v, c.get(\"a\"), dyn.x, fromExpr.v);\nconst withAs = new Box<{ n: number }>({ n: 1 } as { n: number });\nconsole.log(withAs.v.n);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-abstract-and-static-members",
    "title": "抽象成员、抽象静态、抽象访问器都不产生实现",
    "src": "abstract class Repo<T> {\n  abstract find(id: string): T | undefined;\n  abstract get size(): number;\n  static create(): Repo<string> { return new Mem(); }\n  list(): T[] { return []; }\n}\nclass Mem extends Repo<string> {\n  private data = new Map<string, string>();\n  find(id: string): string | undefined { return this.data.get(id); }\n  get size(): number { return this.data.size; }\n  add(id: string, v: string): void { this.data.set(id, v); }\n}\nconst r = Repo.create() as Mem;\nr.add(\"a\", \"1\");\nconsole.log(r.find(\"a\"), r.size, r.list().length, r instanceof Repo);"
  },
  {
    "id": "c371-ex-type-assertions-in-operands",
    "title": "断言出现在运算符的操作数位上",
    "src": "const a: unknown = 1;\nconst b: unknown = 2;\nconsole.log((a as number) + (b as number));\nconsole.log(<number>a + <number>b);\nconsole.log(((a as number) + 1) * 2);\nconst s: unknown = \"x\";\nconsole.log((s as string).length + 1, (s as string) + \"!\");\nconsole.log(({ n: 1 } as { n: number }).n + (2 as number));",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-asi-and-comments",
    "title": "ASI 与夹在语句里的注释不改变语义",
    "src": "const a = 1\nconst b = 2\nfunction f() {\n  return (\n    a + b\n  )\n}\nconst c = /* inline */ 3;\nif (a > 0) {\n  console.log(\"pos\");\n} /* between */ else {\n  console.log(\"neg\");\n}\nconst d = [\n  1, // one\n  2, // two\n];\nconsole.log(f(), c, d.length, a\n  + b);\nconsole.log(typeof c === \"number\" ? \"n\" : \"other\");"
  },
  {
    "id": "c371-ex-numeric-literal-forms",
    "title": "数字字面量：分隔符、进制、指数、BigInt 之外的全部形态",
    "src": "const forms = [1_000_000, 0b1010, 0o17, 0xff, 1e3, 1E-2, 0.5, .5, 5., 1_0.5_0];\nconsole.log(forms.join(\",\"));\nconsole.log(0.1 + 0.2, 1e21, 1e-7, 9007199254740991, 0x10 + 0o10 + 0b10);\nconsole.log((123.456).toFixed(2), 1_000 + 1);"
  },
  {
    "id": "c371-ex-unicode-identifiers",
    "title": "Unicode 标识符与字符串里的转义",
    "src": "const \\u0061bc = 1;\nconst café = 2;\nconst 日本語 = 3;\nconst $d = 4;\nconst _e = 5;\nconsole.log(abc, café, 日本語, $d, _e);\nconsole.log(\"\\u0041\\x42\\u{43}\", \"a\\tb\".length, \"\\0\".length);"
  },
  {
    "id": "c371-ex-void-comma-and-sequence",
    "title": "void / 逗号运算符 / 序列表达式",
    "src": "let n = 0;\nconst r = (n = 1, n = 2, n + 1);\nconsole.log(r, n);\nconsole.log(void 0, void \"x\", typeof void 0);\nfor (let i = 0, j = 3; i < j; i++, j--) { }\nconsole.log((1, 2), (n = 5, n * 2), n);\nconst f = () => (n = 7, n); \nconsole.log(f(), n);"
  },
  {
    "id": "c371-ex-optional-catch-and-finally",
    "title": "可选捕获绑定、try-finally、带类型的 catch",
    "src": "function risky(fail: boolean): string {\n  try {\n    if (fail) throw new TypeError(\"bad\");\n    return \"ok\";\n  } catch {\n    return \"caught\";\n  } finally {\n    console.log(\"fin\", fail);\n  }\n}\nfunction onlyFinally(): number { try { return 1; } finally { console.log(\"f2\"); } }\nconsole.log(risky(false), risky(true), onlyFinally());\ntry { throw new Error(\"e\"); } catch (err: unknown) { console.log((err as Error).message); }"
  },
  {
    "id": "c371-ex-labels-and-control",
    "title": "标签 + break / continue 在嵌套循环与块上",
    "src": "const out: string[] = [];\nouter: for (let i = 0; i < 3; i++) {\n  inner: for (let j = 0; j < 3; j++) {\n    if (j === 1) continue inner;\n    if (i === 2) break outer;\n    out.push(i + \"\" + j);\n  }\n}\nblock: { out.push(\"b\"); if (out.length > 0) break block; out.push(\"never\"); }\nswitch (2) { case 1: out.push(\"one\"); case 2: out.push(\"two\"); case 3: out.push(\"three\"); break; default: out.push(\"d\"); }\nconsole.log(out.join(\",\"));"
  },
  {
    "id": "c371-ex-function-decl-in-block",
    "title": "块里的函数声明与 var / let 的分工",
    "src": "function f(): string {\n  if (true) {\n    function inner(): string { return \"inner\"; }\n    var v = 1;\n    let l = 2;\n    return inner() + v + l;\n  }\n  return typeof inner;\n}\nconsole.log(f(), typeof v === \"undefined\");\n{\n  let scoped = 1;\n  const also = 2;\n  console.log(scoped + also);\n}\nconsole.log(typeof scoped === \"undefined\");"
  },
  {
    "id": "c371-ex-arrow-typed-immediately-called",
    "title": "带类型标注的箭头立即调用与嵌套的立即调用",
    "src": "console.log(((a: number, b: number): number => a + b)(1, 2));\nconsole.log(((x: string): string => ((): string => x + \"!\" )())(\"a\"));\nconsole.log((<T,>(v: T): T => v)(5));\nconst obj = { m: (n: number): number => n * 2 };\nconsole.log(obj.m(3), ((f: (n: number) => number) => f(4))((n) => n + 1));"
  },
  {
    "id": "c371-ex-class-in-const-and-static-computed",
    "title": "类声明 / 类表达式赋给常量，静态计算键",
    "src": "class Declared { v = 1; }\nconst Expr = class { v = 2; };\nconst key = \"k\" + \"ey\";\nclass WithComputed {\n  static [key] = \"static-value\";\n  [key](): string { return \"method\"; }\n  static [\"n\" + 1](): string { return \"n1\"; }\n}\nconst instance = new WithComputed();\nconsole.log(new Declared().v, new Expr().v, (WithComputed as any).key, (WithComputed as any).n1(), instance.key());"
  },
  {
    "id": "c371-ex-getter-setter-with-types",
    "title": "带类型标注的访问器与只读属性",
    "src": "class Temp {\n  private _c = 0;\n  get celsius(): number { return this._c; }\n  set celsius(v: number) { this._c = v; }\n  get fahrenheit(): number { return this._c * 9 / 5 + 32; }\n  readonly id: string = \"t1\";\n}\nconst t = new Temp();\nt.celsius = 100;\nconsole.log(t.celsius, t.fahrenheit, t.id);\nconst lit = { get v(): number { return 3; }, set v(_x: number) {} };\nconsole.log(lit.v);"
  },
  {
    "id": "c371-ex-keyof-typeof-in-type-position",
    "title": "类型位上的 keyof / typeof / 索引访问不产生运行期读取",
    "src": "const config = { host: \"h\", port: 1 };\ntype Keys = keyof typeof config;\ntype Host = (typeof config)[\"host\"];\nfunction get(k: Keys): unknown { return config[k]; }\nconst k: Keys = \"host\";\nconsole.log(get(k), get(\"port\"), typeof (null as unknown as Host));\nconsole.log(Object.keys(config).join(\",\"));"
  },
  {
    "id": "c371-ex-readonly-and-tuples",
    "title": "readonly 数组 / 元组 / 只读参数不影响运行期",
    "src": "const ro: readonly number[] = [1, 2, 3];\nconst tup: readonly [string, number, ...boolean[]] = [\"a\", 1, true];\nfunction consume(xs: readonly string[]): number { return xs.length; }\nconst opt: [number, string?] = [1];\nconst named: [first: number, second: string] = [2, \"s\"];\nconsole.log(ro.length, tup.length, consume([\"a\"]), opt.length, named.join(\",\"));\nconsole.log([...ro].join(\"-\"), ro.map((v) => v * 2).join(\",\"));"
  },
  {
    "id": "c371-ex-mapped-and-indexed-types",
    "title": "映射类型 / 索引访问类型 / 交叉类型都是擦除的",
    "src": "type Base = { a: number; b: string };\ntype Partial2 = { [K in keyof Base]?: Base[K] };\ntype Picked = Pick<Base, \"a\">;\ntype Combined = Base & { c: boolean };\nconst p: Partial2 = { a: 1 };\nconst picked: Picked = { a: 2 };\nconst combined: Combined = { a: 1, b: \"s\", c: true };\nconsole.log(p.a, picked.a, combined.b, combined.c, Object.keys(combined).join(\",\"));"
  },
  {
    "id": "c371-ex-generic-constraints-defaults",
    "title": "泛型的约束与默认值只是编译期信息",
    "src": "interface HasId { id: string }\nfunction byId<T extends HasId, K extends keyof T = keyof T>(items: T[], key: K): T[] {\n  return items.slice().sort((x, y) => String(x[key]).localeCompare(String(y[key])));\n}\nclass Store<T extends HasId = HasId> {\n  private items: T[] = [];\n  add(item: T): void { this.items.push(item); }\n  all(): T[] { return this.items; }\n}\nconst s = new Store();\ns.add({ id: \"b\" });\ns.add({ id: \"a\" });\nconsole.log(s.all().map((x) => x.id).join(\",\"), byId([{ id: \"z\" }, { id: \"y\" }], \"id\").map((x) => x.id).join(\",\"));"
  },
  {
    "id": "c371-ex-union-narrowing-runtime",
    "title": "联合类型收窄的判据全是运行期的 typeof",
    "src": "type Shape = { kind: \"circle\"; r: number } | { kind: \"square\"; s: number } | string;\nfunction area(x: Shape): number {\n  if (typeof x === \"string\") return x.length;\n  if (x.kind === \"circle\") return 3 * x.r * x.r;\n  return x.s * x.s;\n}\nfunction describe(v: string | number | null | undefined): string {\n  if (v === null) return \"null\";\n  if (v === undefined) return \"undef\";\n  return typeof v === \"string\" ? \"s:\" + v : \"n:\" + v;\n}\nconsole.log(area({ kind: \"circle\", r: 2 }), area({ kind: \"square\", s: 3 }), area(\"abcd\"));\nconsole.log(describe(null), describe(undefined), describe(\"x\"), describe(1));"
  },
  {
    "id": "c371-ex-decorator-free-mixins",
    "title": "不用装饰器的混入：类表达式 + 泛型构造器签名",
    "src": "type Ctor<T = {}> = new (...args: any[]) => T;\nfunction Timestamped<TBase extends Ctor>(Base: TBase) {\n  return class extends Base {\n    createdAt = 1000;\n    stamp(): string { return \"t\" + this.createdAt; }\n  };\n}\nfunction Tagged<TBase extends Ctor>(Base: TBase) {\n  return class extends Base {\n    tag = \"x\";\n    describe(): string { return this.tag; }\n  };\n}\nclass Plain { v = 1; }\nconst Mixed = Tagged(Timestamped(Plain));\nconst m = new Mixed();\nconsole.log(m.v, m.createdAt, m.stamp(), m.tag, m.describe(), m instanceof Plain);"
  },
  {
    "id": "c371-ex-import-type-erased",
    "title": "import type / export type 这一档在单文件里只是擦除",
    "src": "type Local = { n: number };\nconst value: Local = { n: 1 };\nfunction use<T>(x: T): T { return x; }\nconsole.log(use(value).n, use(\"s\"), typeof use);\ndeclare const anything: unknown;\nconsole.log(typeof anything, value.n + 1);"
  },
  {
    "id": "c371-ex-function-type-values",
    "title": "函数类型标注、可选参数、剩余参数、默认参数一起",
    "src": "type Handler = (event: string, payload?: unknown) => void;\ntype Reducer = (state: number, action: { type: string }) => number;\nconst handlers: Handler[] = [];\nhandlers.push((e, p) => console.log(\"h1\", e, p === undefined));\nconst reducer: Reducer = (state, action) => state + (action.type === \"inc\" ? 1 : 0);\nfunction configure(opts: { retries?: number; onError?: Handler } = {}): number { return opts.retries ?? 0; }\nhandlers[0](\"e\");\nconsole.log(reducer(reducer(0, { type: \"inc\" }), { type: \"dec\" }), configure(), configure({ retries: 3 }));"
  },
  {
    "id": "c371-ex-never-unknown-void-values",
    "title": "never / unknown / void 作为值位与返回位",
    "src": "function fail(msg: string): never { throw new Error(msg); }\nfunction log(msg: string): void { console.log(msg); }\nfunction parse(v: unknown): number { return typeof v === \"number\" ? v : 0; }\nconst v: unknown = \"x\";\nconsole.log(parse(v), parse(2), log(\"logged\"), parse(undefined));\ntry { fail(\"boom\"); } catch (e) { console.log(\"caught\", (e as Error).message); }"
  },
  {
    "id": "c371-ex-switch-with-types-and-blocks",
    "title": "switch 里的类型标注、块作用域与贯穿",
    "src": "type Cmd = \"add\" | \"del\" | \"list\";\nfunction run(cmd: Cmd, n: number): string {\n  let acc = 0;\n  switch (cmd) {\n    case \"add\": {\n      const step: number = n;\n      acc += step;\n      break;\n    }\n    case \"del\":\n      acc -= n;\n    case \"list\":\n      acc += 100;\n      break;\n    default: {\n      const never: never = cmd;\n      acc = -1;\n    }\n  }\n  return String(acc);\n}\nconsole.log(run(\"add\", 5), run(\"del\", 5), run(\"list\", 1));"
  },
  {
    "id": "c371-ex-class-generic-static-and-instance",
    "title": "泛型类的静态成员与实例成员分工",
    "src": "class Registry<T> {\n  static count = 0;\n  static of<T>(v: T): Registry<T> { Registry.count++; return new Registry<T>(v); }\n  private items: T[] = [];\n  constructor(private seed: T) { this.items.push(seed); }\n  add(v: T): this { this.items.push(v); return this; }\n  values(): T[] { return this.items; }\n  static reset(): void { Registry.count = 0; }\n}\nconst r = Registry.of(\"a\").add(\"b\");\nconsole.log(r.values().join(\",\"), Registry.count, typeof Registry.of);\nRegistry.reset();\nconsole.log(Registry.count);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-ex-nested-scopes-and-shadowing",
    "title": "嵌套作用域、遮蔽、与枚举/常量在内层",
    "src": "const name = \"outer\";\nfunction f(): string {\n  const name = \"inner\";\n  {\n    const name = \"block\";\n    if (true) {\n      const name = \"if\";\n      return name;\n    }\n  }\n  return name;\n}\nlet counter = 0;\nfor (let i = 0; i < 2; i++) { counter += i; }\nconsole.log(f(), name, counter, (() => { const name = \"arrow\"; return name; })());"
  },
  {
    "id": "c371-ex-type-assertion-in-return-throw",
    "title": "return / throw / yield 位置上的断言与泛型",
    "src": "function f(v: unknown): { n: number } { return { n: v as number }; }\nfunction g(): void { throw new Error(String(1 as number)); }\nfunction* gen(): Generator<number> { yield 1 as number; yield* [2, 3] as number[]; }\nasync function h(): Promise<string> { return \"s\" as string; }\nconsole.log(f(1).n, [...gen()].join(\",\"));\nh().then((v) => console.log(v));\ntry { g(); } catch (e) { console.log((e as Error).message); }"
  },
  {
    "id": "c371-ex-for-await-and-async-generator",
    "title": "for await 与异步生成器的类型标注",
    "src": "async function* source(): AsyncGenerator<number> {\n  yield 1;\n  yield 2;\n}\nasync function main(): Promise<void> {\n  const out: number[] = [];\n  for await (const v of source()) out.push(v);\n  for await (const v of [Promise.resolve(\"a\"), \"b\"] as any) out.push(String(v).length);\n  console.log(out.join(\",\"));\n}\nmain();"
  },
  {
    "id": "c371-ex-class-implements-generic-and-multiple",
    "title": "implements 多个接口 / 泛型接口的形状擦除",
    "src": "interface Readable<T> { read(): T }\ninterface Writable<T> { write(v: T): void }\ninterface Store<T> extends Readable<T>, Writable<T> { size: number }\nclass Mem<T> implements Store<T> {\n  private items: T[] = [];\n  read(): T { return this.items[0]; }\n  write(v: T): void { this.items.push(v); }\n  get size(): number { return this.items.length; }\n}\nconst m = new Mem<number>();\nm.write(1);\nm.write(2);\nconsole.log(m.read(), m.size, m instanceof Mem);"
  },
  {
    "id": "c371-ex-type-predicate-callbacks",
    "title": "类型谓词写在回调上（运行期就是个布尔函数）",
    "src": "const values: unknown[] = [1, \"a\", null, 2, undefined, \"b\"];\nconst isNum = (v: unknown): v is number => typeof v === \"number\";\nconst nums: number[] = values.filter(isNum);\nconst strs: string[] = values.filter((v): v is string => typeof v === \"string\");\nconsole.log(nums.join(\",\"), strs.join(\",\"), values.filter(Boolean).length);\nconsole.log(values.find(isNum), values.findIndex(isNum), values.every((v) => v !== 0));"
  },
  {
    "id": "c371-ex-abstract-new-and-polymorphism",
    "title": "抽象类的多态调用与 instanceof 分派",
    "src": "abstract class Animal {\n  abstract sound(): string;\n  describe(): string { return this.constructor.name + \":\" + this.sound(); }\n}\nclass Dog extends Animal { sound(): string { return \"woof\"; } }\nclass Cat extends Animal { sound(): string { return \"meow\"; } }\nconst zoo: Animal[] = [new Dog(), new Cat()];\nconsole.log(zoo.map((a) => a.describe()).join(\"|\"));\nconsole.log(zoo.filter((a) => a instanceof Dog).length, zoo.every((a) => a instanceof Animal));"
  },
  {
    "id": "c371-ex-class-field-reserved-and-computed",
    "title": "字段名与语言关键字 / 内建名字撞车",
    "src": "class Odd {\n  static = 1;\n  get = 2;\n  set = 3;\n  class = 5;\n  function = 6;\n  default = 7;\n  if = 8;\n  typeof = 9;\n}\nconst o = new Odd();\nconsole.log(o.static, o.get, o.set, (o as any).class, (o as any).function);\nconsole.log((o as any).default, (o as any).if, (o as any).typeof, Object.keys(o).join(\",\"));"
  },
  {
    "id": "c371-ex-optional-and-rest-params",
    "title": "可选参数、默认参数、剩余参数的实参个数口径",
    "src": "function f(a: number, b?: string, c: number = 10, ...rest: boolean[]): string {\n  return [a, b, c, rest.length].join(\",\");\n}\nconsole.log(f(1), f(1, \"s\"), f(1, \"s\", 2), f(1, undefined, 2, true, false));\nconsole.log(f.length, ((...xs: number[]) => xs.length).length);\nfunction withDefault(x: number = 1, y: number = x + 1): number { return x + y; }\nconsole.log(withDefault(), withDefault(5), withDefault(undefined, 7));"
  },
  {
    "id": "c371-ex-this-type-in-methods",
    "title": "this 类型与链式调用",
    "src": "class Builder {\n  parts: string[] = [];\n  add(p: string): this { this.parts.push(p); return this; }\n  build(): string { return this.parts.join(\"+\"); }\n}\nclass Sub extends Builder {\n  extra(): this { this.parts.push(\"E\"); return this; }\n}\nconsole.log(new Sub().add(\"a\").extra().build());\nconst b: Builder = new Builder();\nconsole.log(b.add(\"x\").add(\"y\").build());"
  },
  {
    "id": "c371-ex-as-precedence-with-operators",
    "title": "as 与算术 / 一元 / 成员运算的优先级",
    "src": "const n: unknown = 3;\nconst s: unknown = \"ab\";\nconsole.log((n as number) + 1, 1 + (n as number), (n as number) * 2);\nconsole.log(-(n as number), !(n as number), typeof (n as number));\nconsole.log(((s as string) + \"\").length, (s as string).length + 1);\nconst o = { v: 1 } as { v: number };\nconsole.log(o.v + 1, o.v as number);"
  },
  {
    "id": "c371-ex-object-literal-and-interface",
    "title": "对象字面量喂给接口：多余的键与嵌套",
    "src": "interface Cfg { host: string; port: number; opts?: { debug: boolean } }\nconst a: Cfg = { host: \"h\", port: 1 };\nconst b: Cfg = { host: \"h\", port: 2, opts: { debug: true } };\nconst list: Cfg[] = [a, b];\nconsole.log(a.port, b.opts!.debug, list.length);\nconsole.log(JSON.stringify(list.map((c) => c.host)), Object.keys(a).join(\",\"));"
  },
  {
    "id": "c371-ex-generic-inference-at-call-site",
    "title": "调用点上显式类型实参与推断的结果一致",
    "src": "function wrap<T>(v: T): { v: T } { return { v }; }\nfunction tuple<A, B>(a: A, b: B): [A, B] { return [a, b]; }\nconst a = wrap(1);\nconst b = wrap<string>(\"s\");\nconst c = tuple(1, \"x\");\nconst d = tuple<number, string>(2, \"y\");\nconsole.log(a.v, b.v, c.join(\"-\"), d.join(\"-\"), wrap<boolean>(true).v);\nclass Queue<T> { items: T[] = []; push(v: T): void { this.items.push(v); } pop(): T | undefined { return this.items.shift(); } }\nconst q = new Queue<number>();\nq.push(1);\nconsole.log(q.pop(), q.pop());"
  },
  {
    "id": "c371-ex-satisfies-and-as-const-combo",
    "title": "satisfies + as const：值不变、类型收窄",
    "src": "const routes = {\n  home: { path: \"/\", auth: false },\n  admin: { path: \"/admin\", auth: true },\n} as const satisfies Record<string, { path: string; auth: boolean }>;\nfunction navigate(name: keyof typeof routes): string { return routes[name].path; }\nconsole.log(navigate(\"home\"), navigate(\"admin\"), routes.admin.auth);\nconsole.log(Object.keys(routes).join(\",\"), routes.home.path.length);"
  },
  {
    "id": "c371-ex-index-signature-iteration",
    "title": "索引签名对象的遍历与取值",
    "src": "interface Dict { [key: string]: number }\nconst d: Dict = { a: 1, b: 2 };\nd[\"c\"] = 3;\nlet total = 0;\nfor (const k in d) total += d[k];\nconsole.log(total, Object.keys(d).join(\",\"), Object.values(d).join(\",\"));\nconst entries = Object.entries(d);\nconsole.log(entries.map(([k, v]) => k + \"=\" + v).join(\" \"));\nconsole.log(d[\"missing\"]);"
  },
  {
    "id": "c371-ex-exhaustive-switch-never-default",
    "title": "穷尽性检查（default 里给 never）与运行期无关",
    "src": "type Kind = \"a\" | \"b\";\nfunction handle(k: Kind): string {\n  switch (k) {\n    case \"a\": return \"A\";\n    case \"b\": return \"B\";\n    default: {\n      const unreachable: never = k;\n      return String(unreachable);\n    }\n  }\n}\nconsole.log(handle(\"a\"), handle(\"b\"), handle(\"c\" as Kind));\nconst map: Record<Kind, number> = { a: 1, b: 2 };\nconsole.log(map.a + map.b);"
  },
  {
    "id": "c371-ex-class-static-inheritance",
    "title": "静态成员随继承走，静态里用 this",
    "src": "class Base {\n  static kind = \"base\";\n  static describe(): string { return \"k=\" + this.kind; }\n  static create(): Base { return new this(); }\n  v = 1;\n}\nclass Mid extends Base {\n  static kind = \"mid\";\n}\nclass Leaf extends Mid {\n  static kind = \"leaf\";\n  static parentKind(): string { return super.kind; }\n}\nconsole.log(Base.describe(), Mid.describe(), Leaf.describe());\nconsole.log(Leaf.parentKind(), Leaf.create() instanceof Leaf, Mid.create() instanceof Mid);\nconsole.log(Object.getPrototypeOf(Leaf) === Mid, (Leaf as any).kind);"
  },
  {
    "id": "c371-ex-union-of-literals-keys",
    "title": "字面量联合类型与 Record 的键在运行期就是字符串",
    "src": "type Key = \"x\" | \"y\" | \"z\";\nconst keys: Key[] = [\"x\", \"y\", \"z\"];\nconst counters = {} as Record<Key, number>;\nfor (const k of keys) counters[k] = 0;\ncounters.x += 1;\ncounters[\"y\"] = 5;\nconsole.log(JSON.stringify(counters), Object.keys(counters).join(\",\"));\nfunction get(o: Record<Key, number>, k: Key): number { return o[k]; }\nconsole.log(get(counters, \"z\"));"
  },
  {
    "id": "c371-ex-class-and-namespace-same-name",
    "title": "同名类型与值可以并存",
    "src": "interface User { id: number }\nconst User = { create(n: number): User { return { id: n }; } };\ntype Status = \"ok\" | \"err\";\nconst Status = { ok: \"ok\" as Status, err: \"err\" as Status };\nconsole.log(User.create(1).id, Status.ok, Status.err);\nclass Node2 { v = 1; }\ninterface Node2 { extra: string }\nconst n: Node2 = Object.assign(new Node2(), { extra: \"e\" });\nconsole.log(n.v, n.extra);"
  },
  {
    "id": "c371-ex-generic-constraint-keyof-usage",
    "title": "keyof 约束下的动态取值与 set",
    "src": "function get<T, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }\nfunction set<T, K extends keyof T>(o: T, k: K, v: T[K]): void { o[k] = v; }\nconst rec = { a: 1, b: \"s\" };\nconsole.log(get(rec, \"a\"), get(rec, \"b\"));\nset(rec, \"a\", 5);\nconsole.log(rec.a, Object.keys(rec).length);\nconst arr: { id: number }[] = [{ id: 1 }, { id: 2 }];\nconsole.log(arr.map((x) => get(x, \"id\")).join(\",\"));"
  },
  {
    "id": "c371-ex-declare-global-and-usage",
    "title": "declare global 里的东西不产生运行期绑定",
    "src": "declare global { interface Window { custom: number } }\nconst local = 1;\nfunction use(x: number): number { return x + local; }\nconsole.log(use(1), typeof globalThis, local);\nconst arr = [1, 2, 3];\nconsole.log(arr.map((v) => use(v)).join(\",\"));"
  },
  {
    "id": "c371-ex-arrow-with-defaults-and-destructure",
    "title": "箭头函数的默认值与解构参数",
    "src": "const f = ({ a, b = 2 }: { a: number; b?: number } = { a: 1 }): number => a + b;\nconst g = ([x, y = 10]: number[] = []): number => x + y;\nconst h = (n: number, cb: (v: number) => number = (v) => v): number => cb(n);\nconsole.log(f(), f({ a: 5 }), g(), g([1]), g([1, 2]), h(3), h(3, (v) => v * 2));\nconsole.log(f.length, g.length, h.length);"
  },
  {
    "id": "c371-ex-class-expression-name-in-body",
    "title": "具名类表达式在体内能看见自己的名字",
    "src": "const A = class Self {\n  static name2(): string { return Self.name; }\n  who(): string { return Self.name2(); }\n};\nconst B = class { static name2(): string { return typeof (this as any); } };\nconsole.log(new A().who(), A.name, new B() instanceof B);\nconst C = class Named { static create(): Named { return new Named(); } v = 1; };\nconsole.log(C.create().v, C.name);"
  },

  // ===== 第 373 轮：给修好的形状补的判据（3 条）=====
  {
    "id": "c373-ex-compound-assign-precedence",
    "title": "复合赋值的右操作数取整个赋值右侧（比自己松的那一段也算）",
    "src": "// **复合赋值右侧是一个完整的 AssignmentExpression**——三元、比自己松的算术、\n// 比自己紧的算术，三种都要落对。\nconst flag = true;\nlet a = 2; a *= 1 + 2; console.log(\"A mul-of-sum\", a);\nlet b = 10; b -= 1 + 2; console.log(\"B sub-of-sum\", b);\nlet c = 1; c += flag ? 2 : 3; console.log(\"C add-of-ternary\", c);\nlet d = 1; d += 1 < 2 ? 4 : 5; console.log(\"D add-of-cmp-ternary\", d);\nlet e = 2; e **= 2 + 1; console.log(\"E pow-of-sum\", e);\nlet f = 8; f /= 1 + 1; console.log(\"F div-of-sum\", f);\nlet g = \"x\"; g += flag ? \"y\" : \"z\"; console.log(\"G concat-of-ternary\", g);\nlet h = 1; h += 2 + 3 + 4; console.log(\"H chain\", h);\nlet i = 1; i += 2 * 3; console.log(\"I tighter\", i);\nlet j = 1; j *= 2 + 3; console.log(\"J mul-then-add\", j);\nlet k = 1; k += (2 + 3) * 2; console.log(\"K paren\", k);\nlet m = 5; m %= 2 + 1; console.log(\"M mod-of-sum\", m);\nlet n = 1; n += 1; console.log(\"N plain\", n);\nlet p = 1; p += -2; console.log(\"P unary\", p);\nconsole.log(\"Q\", a, b, c, d, e, f, g, h, i, j, k, m, n, p);"
  },
  {
    "id": "c373-ex-braceless-bodies",
    "title": "无括号的语句体：`for` / `while` 体里的 `if` 只到自己那个分号为止",
    "src": "// **一条已经成形的语句级单元本身就是语句结束**——for 体里的 if 收好之后，\n// 下一条语句**不该**被算进体里。\nconst log: string[] = [];\nlet i = 0;\nfor (i = 0; i < 2; i++) if (i > 5) log.push(\"never\");\nlog.push(\"after-for-if\");\nlet j = 0;\nfor (j = 0; j < 2; j++) if (j >= 0) log.push(\"body\" + j);\nlog.push(\"after\");\nlet k = 0;\nwhile (k < 2) { k += 1; }\nlog.push(\"after-while\");\nlet m = 0;\nfor (m = 0; m < 3; m++) if (m === 1) log.push(\"mid\");\nlog.push(\"tail\");\nlet n = 0;\nfor (n = 0; n < 2; n++) for (let q = 0; q < 2; q++) if (q === 1) log.push(\"n\" + n + q);\nlog.push(\"end\");\nconsole.log(log.join(\",\"));\nconsole.log(log.filter((x) => x === \"after\").length, log.length);"
  },
  {
    "id": "c373-ex-compound-assign-logical-rhs",
    "title": "复合赋值的右侧是 `||`：逻辑规则位次造成的优先级（**还没修**）",
    "src": "// a += b || c 在 JS 里是 a += (b || c)。\n// 这一条**还没修**：&& / || 那一条规则的位次**排在四则之前**（历史位次），\n// 于是它先把 || 折了，而这时左边那一格还不是「整个 a + b」。\nconst flag = false;\nlet k = -1; k += 0 || 5; console.log(\"A\", k);\nlet m = 10; m += 0 || 5; console.log(\"B\", m);\nconsole.log(\"C\", flag || \"x\");"
  },

  // ===== 第 374 轮：给修好的形状补的判据（3 条）=====
  {
    "id": "c374-ex-generic-new-arguments",
    "title": "带类型实参的 `new`：实参表按顶层逗号切段（不是逗号表达式）",
    "src": "// new Foo<T>(a, b, c) 里那个括号是**实参表**——里面的逗号是分隔符。\nclass Pair<T> {\n  constructor(public first: T, public second: T) {}\n}\nconst p = new Pair<number>(1, 2);\nconsole.log(\"A\", p.first, p.second, Object.keys(p).join(\",\"));\nclass Triple<T> {\n  constructor(public a: number, public b: number, public c: number) {}\n}\nconst t = new Triple<string>(3, 4, 5);\nconsole.log(\"B\", t.a, t.b, t.c);\nclass Var<T, U> {\n  constructor(public x: number, public y: number, public z: number) {}\n}\nconst v = new Var<string, boolean>(6, 7, 8);\nconsole.log(\"C\", v.x, v.y, v.z);\nnamespace NS { export class Deep<T> { constructor(public n: number, public m: number) {} } }\nconst d = new NS.Deep<number>(9, 10);\nconsole.log(\"D\", d.n, d.m);\nconst nested = new Pair<Pair<number>>(new Pair<number>(1, 2), new Pair<number>(3, 4));\nconsole.log(\"F\", nested.first.second, nested.second.first);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c374-ex-nested-arrow-this",
    "title": "两层箭头里的 `this`：箭头自己不开格，取最近那个普通函数",
    "src": "// 箭头**没有自己的接收者**——它的 this 是造它那一刻外层的，\n// 而「外层」要一路走到**最近的那个普通函数 / 方法 / 构造函数**。\ntype Job = { name: string; deps: string[] };\nclass Board {\n  done = new Set<string>([\"build\"]);\n  jobs(): Job[] { return [{ name: \"a\", deps: [\"build\"] }, { name: \"b\", deps: [\"x\"] }]; }\n  ready(): Job[] { return this.jobs().filter((j) => j.deps.every((d) => this.done.has(d))); }\n  names(): string[] { return this.jobs().filter((j) => j.deps.some((d) => this.done.has(d))).map((j) => j.name); }\n}\nconst b = new Board();\nconsole.log(\"A\", b.ready().length, b.names().join(\",\"));\n\nclass Level2 {\n  factor = 10;\n  apply(xs: number[]): number[] { return xs.map((x) => xs.map((y) => x + y + this.factor)[0]); }\n}\nconsole.log(\"B\", new Level2().apply([1, 2]).join(\",\"));\n\nclass FieldArrow {\n  factor = 5;\n  f = (xs: number[]): number => xs.filter((x) => x > this.factor).length;\n}\nconsole.log(\"C\", new FieldArrow().f([1, 6, 9]));\n\nclass ThreeDeep {\n  base = 1;\n  run(): number { return [[2]].map((outer) => outer.map((n) => [n].map((m) => m + this.base)[0])[0])[0]; }\n}\nconsole.log(\"D\", new ThreeDeep().run());\n\nfunction outerFn(this: any): number {\n  return [1].map(() => [2].map(() => this.tag)[0])[0];\n}\nconsole.log(\"E\", outerFn.call({ tag: \"t\" }));"
  },
  {
    "id": "c374-ex-throw-in-reentrant-callback",
    "title": "回调里**再进一次**原生回调并且抛出：异常要一路穿回最外层（**还没修**）",
    "src": "// f 在 .map 的回调里**递归**，而递归那一层又进了一次 .map——\n// 也就是「脚本 → 原生 → 脚本 → 原生」这条链。\n// 这一条**还没修**：异常从重入那一层出来之后没有穿回最外层的 try。\nfunction walk(n: number): number {\n  if (n === 0) throw new Error(\"bottom\");\n  return [n].map((x) => walk(n - 1))[0];\n}\ntry { walk(3); console.log(\"no throw\"); } catch (e) { console.log(\"A caught\", (e as Error).message); }\nfunction plain(n: number): number { if (n === 0) throw new Error(\"plain-bottom\"); return plain(n - 1); }\ntry { plain(3); } catch (e) { console.log(\"B caught\", (e as Error).message); }\nconsole.log(\"done\");"
  },

  // ===== 第 375 轮：给修好的形状补的判据（2 条）=====
  {
    "id": "c375-ex-new-argument-object-literal",
    "title": "`new` 实参表里的对象字面量（不是类型字面量）",
    "src": "// new Box({ … }) 里那个 { 是**对象字面量**——new 不能把它拉成类型位。\nclass Box<T> {\n  constructor(public v: any) {}\n}\nconst a = new Box({ n: 3 });\nconsole.log(\"A\", a.v.n);\nconst b = new Box<number>({ n: 4 });\nconsole.log(\"B\", b.v.n);\nconst c = new Box<{ n: number }>({ n: 5 });\nconsole.log(\"C\", c.v.n);\nclass Pair {\n  constructor(public first: any, public second: any) {}\n}\nconst d = new Pair({ k: 1 }, { k: 2 });\nconsole.log(\"D\", d.first.k, d.second.k);\nclass Nested {\n  constructor(public v: any) {}\n}\nconst e = new Nested({ inner: { deep: 7 } });\nconsole.log(\"E\", e.v.inner.deep);\nconst f = new Nested([{ n: 8 }][0]);\nconsole.log(\"F\", f.v.n);\nconst g = new Nested(({ n: 9 }));\nconsole.log(\"G\", g.v.n);\nconst h = new Nested(new Nested({ n: 10 }));\nconsole.log(\"H\", h.v.v.n);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c375-ex-arrow-return-type-annotations",
    "title": "箭头的返回类型标注（数组 / 联合 / 元组 / 类型字面量）与块体",
    "src": "// **返回类型标注长什么样，都不能把箭头的块体带成类型字面量**。\nconst build = (list: number[]): number[] => {\n  const out: number[] = [];\n  for (const v of list) out.push(v * 2);\n  return out;\n};\nconsole.log(\"A\", build([1, 2]).join(\",\"));\nconst pick = (cells: string[]): string | null => {\n  if (cells.length === 0) return null;\n  return cells[0];\n};\nconsole.log(\"B\", pick([\"x\"]), pick([]));\nconst tuple = (): [number, string] => {\n  return [1, \"s\"];\n};\nconsole.log(\"C\", tuple().join(\":\"));\nconst obj = (n: number): { v: number } => {\n  return { v: n + 1 };\n};\nconsole.log(\"D\", obj(2).v);\nconst gen = (n: number): Array<number> => {\n  return [n];\n};\nconsole.log(\"E\", gen(3).length);\nconst plain = (n: number): number => {\n  return n;\n};\nconsole.log(\"F\", plain(4));\nconst noAnno = (n: number) => {\n  return n * 2;\n};\nconsole.log(\"G\", noAnno(5));\nconst nested = (xs: number[]): number[] => {\n  const inner = (ys: number[]): number[] => {\n    return ys;\n  };\n  return inner(xs);\n};\nconsole.log(\"H\", nested([6]).join(\",\"));"
  },

  // ===== 第 378 轮：给修好的形状补的判据（1 条）=====
  {
    "id": "c378-ex-enum-member-references",
    "title": "枚举的初始化式引用前面的成员（含遮蔽外层同名变量）",
    "src": "// TS 的规矩：枚举成员的初始化式可以**不带前缀**引用这条 enum 里前面的成员。\nenum Level { Low = 1, Mid = Low + 1, High = Mid * 2 }\nconsole.log(\"A\", Level.Low, Level.Mid, Level.High, Level[2], Level[4]);\nenum Flags { None = 0, A = 1 << 0, B = 1 << 1, Both = A | B, All = None | A | B | Both }\nconsole.log(\"B\", Flags.A, Flags.B, Flags.Both, Flags.All, Flags[3], Flags[1]);\nconst enum Const { X = 2, Y = X * X, Z = Y + X }\nconsole.log(\"C\", Const.X, Const.Y, Const.Z, Object.keys(Const).join(\",\"));\nenum Mixed { A = \"x\".length, B = A + 4, C = B << 1 }\nconsole.log(\"D\", Mixed.A, Mixed.B, Mixed.C, Mixed[5]);\n// **成员名只属于那条 enum**：外层同名的变量照旧、被闭包捕获的那个也不许被改。\nfunction scoped(): string {\n  let A = 1;\n  const read = (): number => A;\n  enum E { A = 2, B = A + 1 }\n  return [A, E.A, E.B, read()].join(\",\");\n}\nconsole.log(\"E\", scoped());\nfunction outer(): string {\n  const base = 10;\n  enum F { A = base, B = base * 2 }\n  return [base, F.A, F.B].join(\",\");\n}\nconsole.log(\"F\", outer());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },

  // ===== 第 379 轮：给修好的形状补的判据 + 一条新量到的（2 条）=====
  {
    "id": "c379-ex-angle-assertion-operand-positions",
    "title": "尖括号断言 `<T>x` 出现在各种操作数位置上",
    "src": "// TS 里 `<T>x` 是**前缀**那一档（与 `!x` 同一档），所以它前面的位置上\n// 一个左操作数都没有——那些位置**全是**操作数位置，断言都成立。\nconst a: unknown = 1;\nconst b: unknown = 2;\nconsole.log(\"A\", <number>a + <number>b, <number>a - <number>b, <number>a * <number>b);\nconsole.log(\"B\", a ? <number>b : <number>a);\nconsole.log(\"C\", (<number>a), ((<number>a) + 1) * <number>b);\nconst c = <number>a + <number>b + <number>a;\nconsole.log(\"D\", c, <number>a < <number>b);\nlet d: unknown = 5;\nd = <number>d + 1;\nconsole.log(\"E\", d, <string>\"x\" + \"y\");\nfunction pick(v: unknown): number {\n  return <number>v * 2;\n}\nconsole.log(\"F\", pick(a), pick(3));\nconst arr = [<number>a, <number>b];\nconsole.log(\"G\", arr.join(\",\"));\nconsole.log(\"H\", <number>a === 1, <number>a !== 2);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c379-ex-angle-assertion-after-prefix-operator",
    "title": "打头一元运算符**后面**的尖括号断言（`!<T>x` / `~<T>x`）——**还没修**",
    "src": "// 打头的一元运算符后面跟尖括号断言：Node 给 false / -1，本仓整段投成一个裸的符号节点\n// （**感叹号**报 ExclamationToken、**波浪号**报 TildeToken）⇒ 降级期 unimplemented: expression …。\n// **边界量清了**：!a / !!a / !(a < 2) 都是好的（c379-ex-angle-assertion-operand-positions\n// 那条语料守着）——**打头的一元运算符后面紧跟 <T>** 这一格全都不行 ✗，\n// 而两个符号各自报自己那一个 ⇒ 同一个根子：整段被投成了一个裸的符号节点。\nconst b: unknown = 0;\nconsole.log(!<boolean>b);\nconst c: unknown = 1;\nconsole.log(!<boolean>c, ~<number>c, !b);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },

  // ===== 第 380 轮：标签那两个子形状（1 条）=====
  {
    "id": "c380-ex-label-colon-versus-type-annotation",
    "title": "标签的冒号 vs 类型标注的冒号（两个子形状，**还没修**）",
    "src": "// **同一个冒号、两种意思**：`outer: { … }` 是标签，`x: { … }` 是类型标注。\n// 词法阶段是平列表，分不出这两者——靠的是 `LabelReorganization` 抢在\n// `TypeDefineReorganization` 前面把标签收走。它**只在一种位置上抢不到**：\n// 标签前面还有别的语句时（那一刻前一条语句还没成形，前一个单元是它那个 `}` 括号，\n// `IsStatementStart` 给假）。\n//\n// 子形状 ①：标签块前面还有一条语句\nconst out: string[] = [];\nfor (let i = 0; i < 1; i++) { out.push(\"f\" + i); }\nblock: { out.push(\"b\"); break block; out.push(\"never\"); }\nconsole.log(\"A\", out.join(\",\"));\n// 子形状 ②：标签块里再嵌一个裸块，裸块里 `break` 那个标签\nconst other: string[] = [];\nlbl: { other.push(\"a\"); { break lbl; } other.push(\"never\"); }\nconsole.log(\"B\", other.join(\",\"));"
  },

  // ===== 第 381 轮：标识符转义（2 条）=====
  {
    "id": "c381-ex-identifier-unicode-escapes",
    "title": "标识符写成 `\\uXXXX` / `\\u{…}`：声明的名字就是它解出来的那个",
    "src": "// TS 的规矩：标识符可以写成转义形式，**它的名字是解出来的那个**\n// （TS 的 AST `text` 也是解出来的那个）——所以声明处与使用处必须比同一个字符串。\nconst \\u0061bc = 1;\nconsole.log(\"A\", abc);\nconst caf\\u00e9 = 2;\nconsole.log(\"B\", café);\nconst 日本語 = 4;\nconsole.log(\"D\", 日本語);\nfunction f\\u0066(a: number): number { return a + 1; }\nconsole.log(\"E\", ff(1));\nclass C\\u006cass { v = 8; \\u006dethod(): number { return 9; } }\nconsole.log(\"G\", new Class().v, new Class().method());\nconst mixed = \\u0061bc + caf\\u00e9 + ff(0);\nconsole.log(\"H\", mixed, typeof f\\u0066);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c381-ex-escaped-property-key",
    "title": "对象字面量里**转义的键**（`{ \\u0061: 1 }`）",
    "src": "// 转义的名字在**对象字面量的键**那一格也要解（第 382 轮修好 ✓）。\n// **为什么它值得单独一条** ✗：这一支是投影**自己拿文本合一个节点**的（`nameOf`）✓，\n// 不经过 `Identifier.PrintAst` ✓、也不经过读属性那三处 ✓——第 381 轮那两处都改了 ✓，\n// 这一格却漏着 ✗ ⇒ `Object.keys` 给 [\"\\u0061\"] ✓、`x.a` 给 `undefined` ✓（**静默错值** ✗）。\nconst x = { \\u0061: 1, b: 2 };\nconsole.log(\"A\", x.a, x.b, Object.keys(x).join(\",\"));\nconst y = { caf\\u00e9: 3 };\nconsole.log(\"B\", y.café, Object.keys(y).join(\",\"));\nconst deep = { outer: { \\u0069nner: 4 } };\nconsole.log(\"C\", deep.outer.inner);\nfunction f(): number { return { \\u0076: 5 }.v; }\nconsole.log(\"D\", f());",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c382-ex-braced-escape",
    "title": "`\\u{…}` 花括号写法 —— **还没修**",
    "src": "// 词法层把 \\u{65}scaped 劈成了三格（实测产物：`Let fieldName=\"\\u\"` +\n// `Bracket{65}` + `Identifier(scaped)`）。\n// **边界量清了** ✗：四位 \\uXXXX 那种一直是好的 ✓（变量声明 / 函数名 / 类名 / 方法名 /\n// 对象键全都实测过 ✓）——只有花括号这一种写法 ✗。\n// **试过两处、都没生效** ✗：`Identifier.IsAppend` 放行 `{` 与十六进制 / `}` ✓、\n// `SymbolBranch` 给那几格让路 ✓——因为 `{` 那一刻 `unit.Last()` 已经不是那个 Identifier 了 ✓\n// （它已经被 `Let` 收走成名字属性 ✓）。\nconst \\u{65}scaped = 3;\nconsole.log(\"A\", escaped);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },

  // ===== 第 387 轮：尖括号断言 + 类型字面量（1 条）=====
  {
    "id": "c387-ex-angle-assertion-with-type-literal",
    "title": "尖括号断言的类型是**类型字面量**（`<{ n: number }>{ n: 1 }`）——**还没修**",
    "src": "// 尖括号断言的**类型字面量**后面的那个**值**没有被收成对象字面量。\n// **token 层是对的**（XML 实测）：外层是 GenericType、里面是 TypeLiteral、\n// 紧跟着一格**裸的 Bracket**——那一格没有变成 ObjectLiteral。\n// **根子在那一格的归属**：IsStatementStart 说「这是语句开头」⇒\n// JsonObjectReorganization 让路 ⇒ 投影把它投成一个 **Block** ⇒\n// 降级层报 unimplemented: expression Block（整份文件进不来）。\n// **已试过、没生效**：在 IsStatementStart 里把「前一格是 GenericType」判成\n// 「不是语句开头」——形状一点没变（说明那一格的让路不经过它）。\n// **边界**：<number>x 好；花括号作为**类型**（断言里那半）好——\n// 只有「断言的类型是类型字面量、后面紧跟一个对象字面量」这一格。\nconst a = <{ n: number }>{ n: 1 };\nconsole.log(\"A\", a.n);\nconst b = (<{ n: number; m?: string }>{ n: 2, m: \"x\" }).m;\nconsole.log(\"B\", b);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  // ============ 第 623 轮加宽：普查 tmp/cand-623b.mjs 收进来的场景 ============
  {
    id: "c623-ex-destructure-forof",
    title: "for..of 里解构每一项（数组 / 对象）",
    src: "\nfor (const [k, v] of [[\"a\", 1], [\"b\", 2]] as Array<[string, number]>) console.log(k, v);\nfor (const { x, y = 9 } of [{ x: 1 }, { x: 2, y: 3 }] as any[]) console.log(x, y);\n",
  },
  {
    id: "c623-ex-class-expression-named",
    title: "具名类表达式：内部名只在类体内可见",
    src: "\nconst C = class Inner {\n  static self() { return typeof Inner; }\n  me() { return typeof Inner; }\n};\nconsole.log(C.self(), new C().me(), typeof Inner);\n",
  },
  {
    id: "c623-ex-super-inheritance",
    title: "继承链上的 super：构造器 / 方法 / 静态 / 访问器",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nclass A {\n  constructor(public v: number) {}\n  m() { return \"A\" + this.v; }\n  static s() { return \"SA\"; }\n  get g() { return 1; }\n}\nclass B extends A {\n  constructor() { super(2); }\n  m() { return \"B\" + super.m(); }\n  static s() { return \"SB\" + super.s(); }\n  get g() { return super.g + 1; }\n}\nconst b = new B();\nconsole.log(b.m(), B.s(), b.g, b.v);\n",
  },
  {
    id: "c623-ex-computed-fields",
    title: "计算属性名：类字段 / 方法 / 静态",
    src: "\nconst k = \"a\" + \"b\";\nclass C {\n  [k] = 1;\n  static [k + \"s\"] = 2;\n  [\"m\" + \"1\"]() { return this.ab; }\n}\nconsole.log(new C().ab, (C as any).abs, new C().m1());\n",
  },
  {
    id: "c623-ex-enum-reverse",
    title: "数字枚举的反向映射与字符串枚举",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nenum E { A, B = 5, C }\nenum S { X = \"x\", Y = \"y\" }\nconsole.log(E.A, E.B, E.C, E[0], E[5]);\nconsole.log(S.X, S.Y, JSON.stringify(E));\n",
  },
  {
    id: "c623-ex-namespace-merge",
    title: "namespace 与同名 function / class 合并",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nfunction f() { return 1; }\nnamespace f { export const v = 2; }\nclass C { m() { return 3; } }\nnamespace C { export const w = 4; }\nconsole.log(f(), f.v, new C().m(), C.w);\n",
  },
  {
    id: "c623-ex-param-properties",
    title: "构造函数参数属性：public / private / readonly / 默认值",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nclass C {\n  constructor(public a: number, private b: string = \"b\", readonly c = 3) {}\n  show() { return this.a + this.b + this.c; }\n}\nconsole.log(new C(1).show(), Object.keys(new C(1)).join(\",\"));\n",
  },
  {
    id: "c623-ex-abstract-erasure",
    title: "abstract 成员与类型位一起消失，子类可覆盖",
    src: "\nabstract class A {\n  abstract m(): string;\n  n() { return \"n\" + this.m(); }\n}\nclass B extends A { m() { return \"m\"; } }\nconsole.log(new B().n(), typeof (A as any).prototype.m);\n",
  },
  {
    id: "c623-ex-optional-call",
    title: "可选调用 f?.() 与可选链上的 this",
    src: "\nconst o: any = { v: 1, m() { return this.v; } };\nconsole.log(o.m?.(), o.z?.());\nconsole.log(o?.m?.(), o?.z?.());\nconst f: any = undefined;\nconsole.log(f?.());\n",
  },
  {
    id: "c623-ex-default-params-nullish",
    title: "默认参数只在 undefined（含 null 的差别）时生效",
    src: "\nfunction f(a = 1, b: any = 2) { return a + \",\" + b; }\nconsole.log(f(), f(undefined, undefined), f(null, null), f(0, \"\"));\n",
  },
  {
    id: "c623-ex-generic-erasure",
    title: "泛型的约束 / 默认 / 多重约束全部擦掉",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nfunction f<T extends { a: number }, U = string>(x: T, y?: U): number { return x.a; }\nclass Box<T extends object = {}> { constructor(public v: T) {} }\nconsole.log(f({ a: 1 }), new Box({ z: 2 }).v.z);\n",
  },
  {
    id: "c623-ex-as-satisfies-erasure",
    title: "as / satisfies / 非空断言 / 尖括号断言运行时都不留痕",
    nodeArgs: ["--experimental-transform-types"],
    src: "\nconst a = { x: 1 } as { x: number };\nconst b = { x: 2 } satisfies { x: number };\nconst c = a!.x;\nconst d = <number>(3 as any);\nconsole.log(a.x, b.x, c, d, Object.keys(a).join(\",\"));\n",
  },
  {
    id: "c623-ex-static-inheritance",
    title: "静态成员与静态方法的继承",
    src: "\nclass A { static v = 1; static m() { return this.v; } }\nclass B extends A {}\nconsole.log(B.v, B.m(), Object.getPrototypeOf(B) === A);\n",
  },
  {
    id: "c623-ex-getter-inherit",
    title: "原型上的访问器被继承，赋值走 setter",
    src: "\nclass A {\n  private _v = 1;\n  get v() { return this._v; }\n  set v(x: number) { this._v = x * 3; }\n}\nclass B extends A {}\nconst b = new B();\nb.v = 2;\nconsole.log(b.v, Object.getOwnPropertyNames(b).join(\",\"));\n",
  },
  {
    id: "c630-ex-callee-optional-chain",
    title: "被调用者是括号 / 一次调用时的可选链（(x as T)?.m?.() / f()?.m?.()）",
    src: "\nconst o: any = { m: () => 7 };\nconst p: any = { n: { m: () => 3 } };\nconst f = () => ({ m: () => 5 });\nconsole.log((o as any)?.m?.(), (o as any).m?.(), (p.n)?.m?.(), (p.n).m?.(), f()?.m?.());\nconsole.log((o as any)?.m?.(1, 2), (o as any)?.nope?.());\n",
  },
  {
    id: "c631-ex-comment-adjacency",
    title: "注释夹在语法相邻位置之间（new / for-of / 字段 / 元组成员）",
    src: "\nclass A {\n  v: number;\n  constructor(v: number) {\n    this.v = v;\n  }\n}\nclass B {\n  x /* c */ = 1;\n  y /* c */ ?: number;\n}\nconst a = new /* c */ A(7);\nlet sum = 0;\nfor (const n /* in */ of [1, 2, 3]) {\n  sum += n;\n}\ntype T = [p /* c */?: number, ...rest /* c */: string[]];\nconst t: T = [1, \"a\"];\nconsole.log(a.v, new B().x, sum, t.length);\n",
  },
];
