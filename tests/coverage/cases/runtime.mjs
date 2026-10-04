// 覆盖矩阵：**runtime（引擎）** 这一层。
//
// 一条 = `{ id, title, src }`；`src` 是一段**真的普通 `.ts`**，
// 交给 `node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码（口径见 run.mjs）。
//
// 这一层量的是**引擎**（值 / 堆 / GC / 帧 / IR / 执行器 / 宿主 ABI）：
// 与「这门语言特有」的语法无关，换一门语言也该是这些场景。
// **一条用例只该考一件事**——所以下面按族分块，每条尽量短。

export const runtimeCases = [
  // ============ 值模型：数 ============
  {
    id: "num-int-arith",
    title: "整数四则：截断、负数、余数",
    src: `
console.log(7 + 3, 7 - 3, 7 * 3, 7 / 2, 7 % 3);
console.log(-7 / 2, -7 % 3, 7 % -3, 2 * 3 + 4, 2 + 3 * 4);
console.log(1 / 3, 0 - 0, 5 / 2 - 2);
`,
  },
  {
    id: "num-float-bits",
    title: "浮点：0.1+0.2、大数、小数、特殊值",
    src: `
console.log(0.1 + 0.2, 1.5 * 2, 1e21, 1e-7);
console.log(Number.MAX_SAFE_INTEGER, 9007199254740993);
console.log(1 / 0, -1 / 0, 0 / 0);
`,
  },
  {
    id: "num-int-float-tag",
    title: "同一个数只有一种标签：整的收成 Int、否则 Float",
    src: `
const a = 4 / 2;
const b = 5 / 2;
console.log(a, b, a === 2, b === 2.5);
console.log(Math.floor(b), Math.ceil(b), b - 0.5);
`,
  },
  {
    id: "num-negative-zero",
    title: "-0 与 0：判等、显示、1/x",
    src: `
const z = -0;
console.log(z, 1 / z, 0 === z, z + 1);
`,
  },
  {
    id: "num-nan-propagation",
    title: "NaN 会传染，但 === 永远不成立",
    src: `
const n = 0 / 0;
console.log(n + 1, n * 0, n === n, n !== n);
`,
  },
  {
    id: "num-radix-literals",
    title: "十六 / 八 / 二进制字面量与分隔符、指数写法",
    src: `
console.log(0xff, 0o17, 0b1010, 1_000_000);
console.log(1e3, 1.5e-3, 0.5e1);
`,
  },

  // ============ 值模型：字符串（UTF-16 码元） ============
  {
    id: "str-utf16-units",
    title: "字符串是码元序列：代理对算两格",
    src: `
const s = "a\u{1F600}b";
console.log(s.length, s.charCodeAt(0), s.charCodeAt(1));
console.log("\\u0041" === "A", "\\u{41}" === "A", "\\x41" === "A");
`,
  },
  {
    id: "str-escapes",
    title: "转义：引号、换行、制表、反斜杠",
    src: `
console.log("a\\tb", "x\\ny", "q\\"q", 'p\\'p', "b\\\\s");
console.log("".length, " ".length, "\\u0000".length);
`,
  },
  {
    id: "str-concat-coerce",
    title: "`+` 一边是字符串就是拼接：其余类型怎么变文本",
    src: `
console.log("n=" + 1, "b=" + true, "z=" + null, "u=" + undefined);
console.log(1 + "2", "2" + 1, true + "x", null + "x");
console.log("a" + "b" + "c", "" + 0);
`,
  },
  {
    id: "str-compare",
    title: "字符串按码元比大小（不是按字典）",
    src: `
console.log("a" < "b", "Z" < "a", "abc" < "abd", "ab" < "abc");
console.log("10" < "9", "2" > "10", "" < "a", "a" <= "a");
`,
  },

  // ============ 值模型：真假与判等 ============
  {
    id: "bool-truthiness",
    title: "真假只有一个定义：空串是假、空数组是真",
    src: `
const values = [0, 1, -1, 0.5, "", "0", "false", null, undefined, NaN, true, false];
for (const v of values) { console.log(typeof v, !!v); }
console.log([].length === 0, !![], !![1], !!{});
`,
  },
  {
    id: "eq-strict",
    title: "`===`：不做转换、跨类型一律假",
    src: `
console.log(1 === 1, 1 === "1", null === null, undefined === undefined);
console.log(null === undefined, 0 === -0, NaN === NaN, true === 1);
`,
  },
  {
    id: "eq-loose",
    title: "`==` 那张转换表：null/undefined 只跟彼此相等",
    src: `
console.log(null == undefined, null == 0, undefined == "", 0 == "", 0 == "0");
console.log(1 == true, 0 == false, "" == false, "1" == 1, [] == 0);
`,
  },
  {
    id: "rel-mixed",
    title: "四条关系：两边都是串才按串比，否则走 ToNumber",
    src: `
console.log("10" < 9, 10 < "9", true < 2, null < 1, undefined < 1);
console.log("b" > "a", "2" < "10", 1 <= 1, 2 >= 3);
`,
  },
  {
    id: "op-unary",
    title: "一元：`!` `-` `+` `~` `void`",
    src: `
console.log(!0, !"", !null, -"3", +"3", +true, ~0, ~5);
console.log(void 0, void "x", -(-3), +("2.5"));
`,
  },
  {
    id: "op-typeof-forms",
    title: "`typeof` 的**各种操作数形状**（标识符 / 字面量 / 对象 / 数组 / 函数）",
    src: `
console.log(typeof 1, typeof "s", typeof true, typeof undefined, typeof null);
console.log(typeof {}, typeof [], typeof (() => 1), typeof console);
const named = 5;
console.log(typeof named);
`,
  },
  {
    id: "op-bitwise",
    title: "位运算七条：`& | ^ ~ << >> >>>`",
    src: `
console.log(6 & 3, 6 | 3, 6 ^ 3, ~6, 1 << 4, 256 >> 4, -1 >>> 28);
console.log(5 & -1, 0xff & 0x0f, 1 << 31, (1 << 31) >> 31);
`,
  },
  {
    id: "op-exponent",
    title: "`**` 右结合，且一元 `-` 要用括号才进得去",
    src: `
console.log(2 ** 10, 2 ** 3 ** 2, -(2 ** 2), (-2) ** 2);
let x = 3;
x **= 3;
console.log(x);
`,
  },
  {
    id: "op-compound-assign",
    title: "复合赋值：每一条都只读一次左边",
    src: `
let n = 10;
n += 5; n -= 3; n *= 2; n /= 4; n %= 4;
console.log(n);
let m = 6;
m &= 3; m |= 8; m ^= 1; m <<= 2; m >>= 1;
console.log(m);
`,
  },
  {
    id: "op-increment",
    title: "前置 / 后置 `++` `--`，落点可以是变量、成员、下标",
    src: `
let i = 0;
console.log(i++, i, ++i, i);
const o = { n: 5 };
console.log(o.n++, o.n, --o.n);
const xs = [1, 2];
console.log(xs[0]++, xs[0], ++xs[1]);
`,
  },
  {
    id: "op-comma",
    title: "逗号：从左到右算、值取最后一个",
    src: `
let a = 0;
const b = (a = 1, a + 1, a + 2);
console.log(a, b);
for (let i = 0, j = 3; i < j; i++, j--) { console.log(i, j); }
`,
  },
  {
    id: "op-logical-return-operand",
    title: "`&&` / `||` / `??` 返回的是**操作数**，不是布尔",
    src: `
console.log(0 || "fallback", "x" && "y", null ?? "d", 0 ?? "d", undefined ?? 0);
console.log("" || 0, 1 && 2, 0 && 1, null || undefined);
`,
  },
  {
    id: "op-optional-chain",
    title: "`?.` 家族：属性、下标、调用、连成一串",
    src: `
const o: any = { a: { b: 1 }, m: () => 2, xs: [3] };
console.log(o?.a?.b, o?.z?.b, o?.m?.(), o?.n?.(), o?.xs?.[0], o?.ys?.[9]);
console.log(o.a?.b ?? "d", o.z?.b ?? "d");
`,
  },
  {
    id: "op-typeof-undeclared",
    title: "`typeof` 一个没声明过的名字给 \"undefined\"（不抛）",
    src: `
console.log(typeof nothingHere, typeof globalThis);
console.log(typeof console, typeof Math, typeof JSON);
`,
  },

  // ============ 控制流 ============
  {
    id: "ctl-if-else",
    title: "if / else if / else 与嵌套",
    src: `
function grade(n: number): string {
  if (n >= 90) return "A";
  else if (n >= 80) return "B";
  else if (n >= 60) { if (n >= 70) return "C"; return "D"; }
  else return "F";
}
console.log(grade(95), grade(85), grade(75), grade(65), grade(10));
`,
  },
  {
    id: "ctl-for-classic",
    title: "经典 for：多初始化、多更新、空条件",
    src: `
let sum = 0;
for (let i = 0, j = 10; i < j; i++, j--) sum += i;
console.log(sum);
let k = 0;
for (;;) { if (++k > 3) break; }
console.log(k);
for (let i = 5; i > 0; i--) sum -= i;
console.log(sum);
`,
  },
  {
    id: "ctl-while-do",
    title: "while / do-while：至少跑一次那一条",
    src: `
let n = 0;
while (n < 3) n++;
console.log(n);
let m = 10;
do { m++; } while (m < 3);
console.log(m);
let c = 0;
while (true) { if (c === 2) break; c++; }
console.log(c);
`,
  },
  {
    id: "ctl-switch",
    title: "switch：贯穿、default 在中间、块级声明",
    src: `
function run(n: number): string {
  let s = "";
  switch (n) {
    case 1: s += "a";
    case 2: s += "b"; break;
    case 3: { const t = "c"; s += t; break; }
    default: s += "d";
  }
  return s;
}
console.log(run(1), run(2), run(3), run(9));
`,
  },
  {
    id: "ctl-labels",
    title: "带标签的循环：`continue outer` / `break outer`",
    src: `
let count = 0;
outer: for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (j === 2) continue outer;
    if (i === 3) break outer;
    count++;
  }
}
console.log(count);
`,
  },
  {
    id: "ctl-switch-fallthrough-count",
    title: "经典的 switch 计数（不带 break 的累加）",
    src: `
function days(month: number): number {
  switch (month) {
    case 2: return 28;
    case 4: case 6: case 9: case 11: return 30;
    default: return 31;
  }
}
console.log(days(1), days(2), days(4), days(12));
`,
  },
  {
    id: "ctl-forof-array",
    title: "`for..of`：数组、字符串、以及中途 break",
    src: `
let s = "";
for (const ch of "abc") s += ch.toUpperCase();
console.log(s);
const xs = [10, 20, 30];
let total = 0;
for (const x of xs) { if (x === 20) continue; total += x; }
console.log(total);
for (const x of xs) { if (x === 20) break; console.log("hit", x); }
`,
  },
  {
    id: "ctl-forof-map-set",
    title: "`for..of` 走 Map / Set（键值对解构）",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
let s = "";
for (const [k, v] of m) s += k + v;
console.log(s);
const set = new Set([1, 2, 3]);
let t = 0;
for (const v of set) t += v;
console.log(t);
`,
  },
  {
    id: "ctl-forof-custom-iterable",
    title: "`for..of` 走自定义可迭代物（Symbol.iterator）",
    src: `
const range: any = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let i = this.from;
    const to = this.to;
    return { next: () => (i <= to ? { value: i++, done: false } : { value: 0, done: true }) };
  },
};
let s = 0;
for (const v of range) s += v;
console.log(s, [...range].join(","));
`,
  },
  {
    id: "ctl-nested-break-continue",
    title: "嵌套循环里 break / continue 各回各的层",
    src: `
let hits = 0;
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue;
    if (i === 2) break;
    hits++;
  }
}
console.log(hits);
`,
  },

  // ============ 函数与闭包 ============
  {
    id: "fn-hoisting",
    title: "函数声明与 var 的提升",
    src: `
console.log(early());
function early(): string { return "hoisted"; }
console.log(typeof later);
var later = 1;
console.log(later);
`,
  },
  {
    id: "fn-closure-counter",
    title: "闭包：两个计数器各拿一份环境",
    src: `
function makeCounter() {
  let n = 0;
  return () => ++n;
}
const a = makeCounter();
const b = makeCounter();
console.log(a(), a(), b(), a(), b());
`,
  },
  {
    id: "fn-let-loop-capture",
    title: "`let` 每次迭代一格：闭包各拿各的 i",
    src: `
const fns: Array<() => number> = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
`,
  },
  {
    id: "fn-params-default-rest",
    title: "默认参数（引用前面的参数）+ 剩余参数",
    src: `
function join(sep: string = "-", ...parts: string[]): string { return parts.join(sep); }
console.log(join(), join("+", "a", "b"), join(undefined, "x"));
function grow(n: number, by: number = n): number { return n + by; }
console.log(grow(3), grow(3, 4));
`,
  },
  {
    id: "fn-recursion",
    title: "递归：阶乘 / 斐波那契 / 相互递归",
    src: `
function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
console.log(fact(6));
function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
console.log(fib(15));
function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(10), isOdd(7));
`,
  },
  {
    id: "fn-deep-recursion",
    title: "三千层递归不爆宿主栈（引擎的硬性约定第 2 条）",
    src: `
function depth(n: number): number { return n === 0 ? 0 : 1 + depth(n - 1); }
console.log(depth(3000));
function sum(n: number): number { return n === 0 ? 0 : n + sum(n - 1); }
console.log(sum(2000));
`,
  },
  {
    id: "fn-lexical-this",
    title: "箭头函数取的是**定义处**的 this",
    src: `
class Box {
  value = 7;
  get(): number {
    const f = () => this.value;
    return f();
  }
}
console.log(new Box().get());
const o: any = { n: 3, m() { const f = () => this.n; return f(); } };
console.log(o.m());
`,
  },
  {
    id: "fn-method-this",
    title: "方法调用里的 this 就是接收者（含转手调用）",
    src: `
const o: any = {
  n: 5,
  read() { return this.n; },
};
console.log(o.read());
const detached = { n: 9, read: o.read };
console.log(detached.read());
`,
  },
  {
    id: "fn-higher-order",
    title: "回调、返回函数、当场调用",
    src: `
function apply(x: number, f: (n: number) => number): number { return f(x); }
console.log(apply(3, (n) => n * 2), apply(3, function (n) { return n + 1; }));
console.log((function () { return "iife"; })());
function twice(f: (n: number) => number): (n: number) => number { return (n) => f(f(n)); }
console.log(twice((n) => n + 3)(1));
`,
  },
  {
    id: "fn-arrow-bodies",
    title: "箭头函数的几种体：表达式、对象字面量、块",
    src: `
const id = (x: number) => x;
const obj = (x: number) => ({ v: x });
const blk = (x: number) => { const y = x * 2; return y; };
console.log(id(1), obj(2).v, blk(3));
const cmp = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);
console.log(cmp(1, 2), cmp(2, 1), cmp(2, 2));
`,
  },
  {
    id: "fn-named-expression",
    title: "具名函数表达式：名字只在函数体内可见",
    src: `
const fact = function f(n: number): number { return n <= 1 ? 1 : n * f(n - 1); };
console.log(fact(5), typeof (function g() { return 1; }));
`,
  },

  // ============ 对象与数组 ============
  {
    id: "obj-literal-shapes",
    title: "对象字面量的几种键：标识符、字符串、计算、简写",
    src: `
const k = "dyn";
const v = 4;
const o: any = { a: 1, "b-c": 2, [k]: 3, v, m() { return 5; }, get g() { return 6; } };
console.log(o.a, o["b-c"], o.dyn, o.v, o.m(), o.g);
console.log(Object.keys(o).join(","));
`,
  },
  {
    id: "obj-getter-setter",
    title: "访问器：读走 getter、写走 setter、内部用另一个字段",
    src: `
const o: any = {
  _v: 1,
  get v() { return this._v; },
  set v(x: number) { this._v = x * 2; },
};
o.v = 5;
console.log(o.v, o._v);
`,
  },
  {
    id: "obj-class-accessors",
    title: "类里的 getter / setter / static getter",
    src: `
class Temp {
  private c = 0;
  get celsius(): number { return this.c; }
  set celsius(v: number) { this.c = v; }
  get fahrenheit(): number { return this.c * 9 / 5 + 32; }
}
const t = new Temp();
t.celsius = 100;
console.log(t.celsius, t.fahrenheit);
`,
  },
  {
    id: "obj-shadowing",
    title: "原型链上的遮蔽：自己那一格赢",
    src: `
class A { value = "A"; read(): string { return this.value; } }
class B extends A { value = "B"; }
console.log(new A().read(), new B().read(), new A().value);
`,
  },
  {
    id: "obj-in-delete",
    title: "`in` 走原型链、`delete` 只删自己那一格",
    src: `
class A { m() { return 1; } }
const a: any = new A();
a.own = 2;
console.log("own" in a, "m" in a, "nope" in a);
delete a.own;
console.log("own" in a, Object.keys(a).length);
delete a.m;
console.log(a.m());
`,
  },
  {
    id: "obj-spread",
    title: "对象展开：后面的盖前面的，原对象不动",
    src: `
const a = { x: 1, y: 2 };
const b = { y: 9, z: 3 };
const c = { ...a, ...b, w: 4 };
console.log(c.x, c.y, c.z, c.w, a.y, b.y);
console.log(Object.keys(c).join(","));
`,
  },
  {
    id: "arr-holes",
    title: "数组的洞：length 算、读出来是 undefined、join 留空",
    src: `
const xs = [1, , 3];
console.log(xs.length, xs[1], xs.join("-"), Object.keys(xs).length);
const ys = new Array(3);
console.log(ys.length, ys.join(","), ys[0]);
`,
  },
  {
    id: "arr-nested-and-index",
    title: "嵌套数组、负/越界下标、length 的写",
    src: `
const grid = [[1, 2], [3, 4]];
console.log(grid[1][0], grid[0][1], grid[9]);
const xs = [1, 2, 3];
console.log(xs[-1], xs[xs.length - 1], xs[100]);
`,
  },
  {
    id: "arr-mutation",
    title: "数组原地改：push / pop / shift / unshift / splice",
    src: `
const xs = [1, 2, 3];
console.log(xs.push(4), xs.join(","), xs.pop(), xs.join(","));
console.log(xs.shift(), xs.join(","), xs.unshift(0), xs.join(","));
const ys = [1, 2, 3, 4, 5];
console.log(ys.splice(1, 2).join(","), ys.join(","));
`,
  },
  {
    id: "arr-spread-into-call",
    title: "展开进调用：`f(...xs)`、`Math.max(...xs)`、混合实参",
    src: `
function add3(a: number, b: number, c: number): number { return a + b + c; }
const xs = [1, 2, 3];
console.log(add3(...xs), Math.max(...xs), Math.max(0, ...xs, 9));
function rest(...parts: number[]): number { return parts.length; }
console.log(rest(...xs, 4, 5));
`,
  },
  {
    id: "arr-spread-literal",
    title: "数组字面量里的展开（含字符串展开）",
    src: `
const a = [1, 2];
const b = [0, ...a, 3, ..."xy"];
console.log(b.join(","), [...a].length, [..."abc"].join("|"));
`,
  },
  {
    id: "arr-destructure",
    title: "数组解构：默认值、跳过、剩余、嵌套",
    src: `
const [a, , c = 9, ...rest] = [1, 2, undefined, 4, 5];
console.log(a, c, rest.join(","));
const [[x], [y]] = [[1], [2]];
console.log(x, y);
const [p = "d"] = [];
console.log(p);
`,
  },
  {
    id: "obj-destructure",
    title: "对象解构：改名、默认值、剩余、嵌套",
    src: `
const o = { a: 1, b: 2, c: { d: 3 } };
const { a, b: renamed, z = 9, ...rest } = o;
console.log(a, renamed, z, Object.keys(rest).join(","));
const { c: { d } } = o;
console.log(d);
`,
  },
  {
    id: "obj-destructure-assign",
    title: "解构**赋值**（不是声明）：落点是已有变量",
    src: `
let a = 0;
let b = 0;
({ a, b } = { a: 1, b: 2 });
console.log(a, b);
let xs: number[] = [];
[xs[0], xs[1]] = [7, 8];
console.log(xs.join(","));
`,
  },
  {
    id: "obj-computed-access",
    title: "计算成员：`o[k]`、`o[k]()`、动态拼键",
    src: `
const o: any = { a1: 10, a2: 20, m() { return this.a1 + this.a2; } };
const k = "a";
console.log(o[k + "1"], o[k + "2"], o["m"]());
const keys = ["a1", "a2"];
console.log(keys.map((key) => o[key]).join(","));
`,
  },

  // ============ 异常 ============
  {
    id: "exc-throw-catch-values",
    title: "`throw` 什么都能扔：字符串、数、对象、Error",
    src: `
function attempt(v: any): string {
  try { throw v; } catch (e: any) { return typeof e === "object" ? e.message : String(e); }
}
console.log(attempt("plain"), attempt(7), attempt({ message: "obj" }), attempt(new Error("real")));
`,
  },
  {
    id: "exc-finally-order",
    title: "try / catch / finally 的执行顺序（含没抛的那条路）",
    src: `
function run(shouldThrow: boolean): string {
  let log = "";
  try { log += "try"; if (shouldThrow) throw new Error("x"); log += "-ok"; }
  catch (e) { log += "-catch"; }
  finally { log += "-finally"; }
  return log;
}
console.log(run(false), run(true));
`,
  },
  {
    id: "exc-finally-return",
    title: "`finally` 里 return 会**接管**；值要提前算出来",
    src: `
function a(): number { try { return 1; } finally { console.log("cleanup"); } }
console.log(a());
function b(): number { let n = 0; try { n = 1; return n; } finally { n = 2; } }
console.log(b());
function c(): string { try { return "t"; } finally { return "f"; } }
console.log(c());
`,
  },
  {
    id: "exc-nested-and-rethrow",
    title: "嵌套 try + 重抛 + catch 里再抛",
    src: `
function inner(): string {
  try { throw new Error("inner"); } catch (e: any) { return "caught:" + e.message; }
}
function outer(): string {
  try { return inner(); } finally { console.log("outer-finally"); }
}
console.log(outer());
try {
  try { throw new Error("first"); }
  catch (e: any) { throw new Error("wrapped:" + e.message); }
} catch (e: any) { console.log("top", e.message); }
`,
  },
  {
    id: "exc-error-family",
    title: "错误家族：name / message / instanceof / 自定义子类",
    src: `
try { throw new TypeError("bad type"); } catch (e: any) {
  console.log(e.name, e.message, e instanceof TypeError, e instanceof Error);
}
class MyError extends Error {
  code = 42;
  constructor(message: string) { super(message); this.name = "MyError"; }
}
try { throw new MyError("custom"); } catch (e: any) {
  console.log(e.name, e.message, e.code, e instanceof MyError, e instanceof Error);
}
`,
  },
  {
    id: "exc-catch-rethrow-finally",
    title: "catch 里 throw，finally 照跑，外层接住",
    src: `
function risky(): string {
  try {
    try { throw new Error("a"); }
    catch (e: any) { throw new Error("b:" + e.message); }
    finally { console.log("inner-finally"); }
  } catch (e: any) { return "outer:" + e.message; }
}
console.log(risky());
`,
  },
  {
    id: "exc-uncaught-exit-code",
    title: "没接住的异常：两边都以退出码 1 结束（钉的是这一档）",
    nodeMayFail: true,
    src: `
console.log("before");
throw new Error("uncaught on purpose");
`,
  },

  // ============ 类 ============
  {
    id: "cls-basic",
    title: "类：字段、构造函数、方法、方法之间的调用",
    src: `
class Point {
  x = 0;
  y = 0;
  constructor(x: number, y: number) { this.x = x; this.y = y; }
  sum(): number { return this.x + this.y; }
  scaled(k: number): Point { return new Point(this.x * k, this.y * k); }
  toString(): string { return "(" + this.x + "," + this.y + ")"; }
}
const p = new Point(2, 3);
console.log(p.sum(), p.scaled(2).toString(), "" + p);
`,
  },
  {
    id: "cls-inheritance-super",
    title: "继承：super(...)、super.m()、字段初始化顺序",
    src: `
class Animal {
  name: string;
  constructor(name: string) { this.name = name; }
  speak(): string { return this.name + " makes a sound"; }
}
class Dog extends Animal {
  legs = 4;
  constructor(name: string) { super(name + "!"); }
  speak(): string { return super.speak() + " (woof, " + this.legs + " legs)"; }
}
console.log(new Animal("cat").speak());
console.log(new Dog("rex").speak(), new Dog("rex") instanceof Animal);
`,
  },
  {
    id: "cls-static",
    title: "static 成员、静态方法互调、静态字段",
    src: `
class Counter {
  static total = 0;
  static bump(): number { return ++Counter.total; }
  static get doubled(): number { return Counter.total * 2; }
}
Counter.bump();
Counter.bump();
console.log(Counter.total, Counter.doubled, Counter.bump());
`,
  },
  {
    id: "cls-private",
    title: "私有成员：`#n` / `#m()` / `static #s`",
    src: `
class Account {
  #balance = 0;
  static #count = 0;
  constructor() { Account.#count++; }
  #clamp(v: number): number { return v < 0 ? 0 : v; }
  deposit(v: number): void { this.#balance = this.#clamp(this.#balance + v); }
  get balance(): number { return this.#balance; }
  static get count(): number { return Account.#count; }
}
const a = new Account();
a.deposit(10);
a.deposit(-3);
console.log(a.balance, Account.count, Object.keys(a).length);
`,
  },
  {
    id: "cls-arrow-field",
    title: "字段初始化式里的**箭头**（`f = () => this.v` —— 遍地都是的写法）",
    src: `
class C {
  v = 1;
  f = () => this.v + 1;
  g = (n: number) => n * this.v;
}
const c = new C();
console.log(c.f(), c.g(5), Object.keys(c).length);
`,
  },
  {
    id: "cls-private-in-expression",
    title: "私有字段**出现在表达式里**（`this.#n + 1` / `this.#n * 2` / `this.#n++`）",
    src: `
class Counter {
  #n = 7;
  plus(): number { return this.#n + 1; }
  times(): number { return this.#n * 2; }
  test(): boolean { return this.#n === 7; }
  post(): number { return this.#n++; }
  get value(): number { return this.#n; }
}
const c = new Counter();
console.log(c.plus(), c.times(), c.test(), c.post(), c.value);
`,
  },
  {
    id: "cls-static-block",
    title: "静态块：类求值时跑一次，可以读别的静态字段",
    src: `
class Config {
  static values: number[] = [];
  static total = 0;
  static { Config.values.push(1); Config.values.push(2); Config.total = 3; }
}
console.log(Config.values.join(","), Config.total);
`,
  },
  {
    id: "cls-instanceof-chain",
    title: "instanceof 沿原型链判断（三层）",
    src: `
class A {}
class B extends A {}
class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(new A() instanceof B, new A() instanceof C);
`,
  },
  {
    id: "cls-expression",
    title: "类表达式：赋给变量、当返回值、当场 new",
    src: `
const C = class { n = 1; get(): number { return this.n; } };
console.log(new C().get());
function make(k: number) { return class { v = k; }; }
console.log(new (make(5))().v);
console.log(new (class { z = 9; })().z);
`,
  },
  {
    id: "cls-override-toString-valueOf",
    title: "自定义 toString / valueOf 在字符串化与算术里生效",
    src: `
class Money {
  cents: number;
  constructor(cents: number) { this.cents = cents; }
  valueOf(): number { return this.cents; }
  toString(): string { return "$" + this.cents / 100; }
}
const m = new Money(250);
console.log("" + m, m + 50, m * 2, m > 100);
`,
  },

  // ============ 生成器 ============
  {
    id: "gen-basics",
    title: "生成器：yield 的先后、next 的返回值、提前 return",
    src: `
function* g() {
  yield 1;
  yield 2;
  return "done";
}
const it = g();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
`,
  },
  {
    id: "gen-forof-spread",
    title: "生成器进 `for..of`、展开、解构、Array.from",
    src: `
function* nums(): any { yield 1; yield 2; yield 3; }
console.log([...nums()].join(","));
let s = 0;
for (const v of nums()) s += v;
console.log(s);
const [a, b] = nums();
console.log(a, b, Array.from(nums()).length);
`,
  },
  {
    id: "gen-delegating",
    title: "`yield*`：转发另一个可迭代物（数组与生成器）",
    src: `
function* inner(): any { yield 2; yield 3; }
function* outer(): any { yield 1; yield* inner(); yield* [4, 5]; yield 6; }
console.log([...outer()].join(","));
`,
  },
  {
    id: "gen-lazy-and-state",
    title: "生成器是惰性的：body 里的副作用只在推的时候发生",
    src: `
const log: string[] = [];
function* g(): any { log.push("start"); yield 1; log.push("mid"); yield 2; log.push("end"); }
const it = g();
console.log(log.length, it.next().value, log.join(","));
console.log(it.next().value, log.join(","));
console.log(it.next().done, log.join(","));
`,
  },

  // ============ 承诺 / 异步 ============
  {
    id: "prm-then-chain",
    title: "Promise：resolve → then → then，值是逐级传的",
    src: `
Promise.resolve(1)
  .then((v: number) => v + 1)
  .then((v: number) => { console.log("chained", v); return v * 10; })
  .then((v: number) => console.log("last", v));
console.log("sync-first");
`,
  },
  {
    id: "prm-catch",
    title: "Promise：reject → catch 接住 → 之后回到兑现那条路",
    src: `
Promise.reject(new Error("nope"))
  .catch((e: any) => "recovered:" + e.message)
  .then((v: any) => console.log(v));
Promise.resolve("ok").then((v: any) => console.log("fine", v));
`,
  },
  {
    id: "prm-finally",
    title: "Promise：finally 不改变值、也不吞掉拒绝",
    src: `
Promise.resolve("v").finally(() => console.log("cleanup-1")).then((v: any) => console.log("got", v));
Promise.reject("bad").finally(() => console.log("cleanup-2")).catch((e: any) => console.log("caught", e));
`,
  },
  {
    id: "prm-combinators",
    title: "Promise.all / race：顺序与先到先得",
    src: `
Promise.all([Promise.resolve(1), Promise.resolve(2), 3]).then((xs: any) => console.log("all", xs.join(",")));
Promise.race([Promise.resolve("fast"), Promise.resolve("slow")]).then((v: any) => console.log("race", v));
Promise.all([]).then((xs: any) => console.log("empty", xs.length));
`,
  },
  {
    id: "prm-async-await",
    title: "async / await：顺序、返回值、await 一个非承诺",
    src: `
async function f(): Promise<number> {
  const a = await Promise.resolve(1);
  const b = await 2;
  return a + b;
}
f().then((v: number) => console.log("sum", v));
async function g(): Promise<void> {
  console.log("g-start");
  const v = await Promise.resolve("x");
  console.log("g-got", v);
}
g();
console.log("after-call");
`,
  },
  {
    id: "prm-async-throw",
    title: "async 函数里 throw ⇒ 返回的承诺被拒绝",
    src: `
async function boom(): Promise<number> { throw new Error("async-fail"); }
boom().catch((e: any) => console.log("caught", e.message));
async function tryInside(): Promise<string> {
  try { await boom(); return "unreachable"; } catch (e: any) { return "handled:" + e.message; }
}
tryInside().then((v: string) => console.log(v));
`,
  },
  {
    id: "prm-microtask-order",
    title: "微任务的顺序：同步先跑完，再按排队的先后",
    src: `
console.log("1");
Promise.resolve().then(() => console.log("3"));
Promise.resolve().then(() => { console.log("4"); Promise.resolve().then(() => console.log("5")); });
console.log("2");
`,
  },

  // ============ 堆 / 回收 ============
  {
    id: "gc-churn",
    title: "大量短命分配：回收器要跟得上（不 OOM）",
    src: `
let total = 0;
for (let i = 0; i < 20000; i++) {
  const xs = [i, i + 1, i + 2];
  total += xs[0] + xs[2];
}
console.log(total);
`,
  },
  {
    id: "gc-survive",
    title: "跨过回收还活着的对象：句柄稳定、内容不丢",
    src: `
const keep: any[] = [];
for (let i = 0; i < 200; i++) keep.push({ i, text: "v" + i });
for (let i = 0; i < 20000; i++) { const junk = [i]; }
console.log(keep.length, keep[0].text, keep[199].i, keep[100].text);
`,
  },
  {
    id: "gc-closure-heap",
    title: "闭包环境也是堆对象：被捕获的变量活到闭包死",
    src: `
function make(): () => number {
  let n = 0;
  const bump = () => ++n;
  for (let i = 0; i < 5000; i++) { const junk = { i }; }
  return bump;
}
const f = make();
console.log(f(), f(), f());
`,
  },
  {
    id: "gc-cyclic",
    title: "互相引用的对象：照样回收得掉（mark-sweep）",
    src: `
for (let i = 0; i < 5000; i++) {
  const a: any = { name: "a" + i };
  const b: any = { name: "b" + i, peer: a };
  a.peer = b;
}
const survivor = { name: "alive" };
console.log(survivor.name);
`,
  },
];
