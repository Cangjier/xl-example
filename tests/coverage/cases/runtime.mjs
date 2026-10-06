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

  // ============ 第 219 轮补的一批：普通 `.ts` 里常见、但矩阵此前没盖到的形状 ============
  {
    id: "fn-call-apply-bind",
    title: "`f.call(o, …)` / `f.apply(o, xs)` / `f.bind(o)`",
    src: `
function greet(this: any, a: number, b: number) { return this.tag + ":" + (a + b); }
const o = { tag: "T" };
console.log(greet.call(o, 1, 2), greet.apply(o, [3, 4]));
const bound = greet.bind(o, 10);
console.log(bound(5));
`,
  },
  {
    id: "ctl-for-in",
    title: "`for..in` 走自有可枚举（原型链上的不算）",
    src: `
const o: any = { a: 1, b: 2 };
const seen: string[] = [];
for (const k in o) seen.push(k);
console.log(seen.sort().join(","), o.a + o.b);
class A { m() { return 1; } }
const a: any = new A();
a.own = 3;
const keys2: string[] = [];
for (const k in a) keys2.push(k);
console.log(keys2.join(","));
`,
  },
  {
    id: "exc-throw-in-callback",
    title: "回调里抛：外层 `try` 接得住，且 `finally` 照跑",
    src: `
let log = "";
try {
  [1, 2, 3].forEach((v: number) => { if (v === 2) throw new Error("cb" + v); log += v; });
} catch (e: any) {
  log += "|caught:" + e.message;
} finally {
  log += "|fin";
}
console.log(log);
`,
  },
  {
    id: "gen-try-finally",
    title: "生成器里的 `try` / `finally`（提前 `return` 时也要跑）",
    src: `
function* g(): any {
  try { yield 1; yield 2; } finally { console.log("cleanup"); }
}
const it = g();
console.log(it.next().value, it.next().value, it.next().done);
function* h(): any { try { yield 1; return "early"; } finally { console.log("h-cleanup"); } }
const it2 = h();
console.log(it2.next().value, it2.next().value);
`,
  },
  {
    id: "arr-sort-comparator-zero",
    title: "`sort` 的比较器返回 0 / 默认按文本排",
    src: `
const xs = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 0, n: "c" }];
console.log(xs.slice().sort((p, q) => p.k - q.k).map((p) => p.n).join(""));
const words = ["pear", "Apple", "fig"];
console.log(words.slice().sort().join(","));
`,
  },
  {
    id: "str-template-with-calls",
    title: "模板字面量里嵌调用 / 嵌套模板 / 三元",
    src: `
const xs = [1, 2];
console.log(\`len=\${xs.length} sum=\${xs.reduce((a, b) => a + b, 0)} \${xs.length > 1 ? "many" : "one"}\`);
console.log(\`outer \${xs.map((v) => \`<\${v}>\`).join("")} end\`);
`,
  },
  {
    id: "num-round-trip",
    title: "`toFixed` → `Number` 往返，以及 `parseFloat` / `parseInt` 的边角",
    src: `
const x = 1 / 3;
console.log(x.toFixed(4), Number(x.toFixed(4)) === 0.3333);
console.log(parseFloat("1.5e2"), parseInt("0x1f"), Number("  7  "));
`,
  },
  {
    id: "obj-shorthand-and-in",
    title: "对象简写 / 计算键 / `in` 与 `delete` 的组合",
    src: `
const k = "dyn";
const v = 5;
const o: any = { v, [k]: 1, m() { return 2; } };
console.log(o.v, o.dyn, o.m(), "v" in o, "nope" in o);
delete o.dyn;
console.log("dyn" in o, Object.keys(o).sort().join(","));
`,
  },
  {
    id: "cls-inherited-accessor",
    title: "继承链上的访问器与 `super` 取值",
    src: `
class A { get v(): number { return 1; } }
class B extends A { get v(): number { return super.v + 1; } }
class C extends B {}
console.log(new A().v, new B().v, new C().v);
`,
  },
  {
    id: "exc-nested-error-fields",
    title: "错误对象上的自定义字段 + 嵌套抛出 + `instanceof` 分派",
    src: `
class Http extends Error {
  status: number;
  constructor(status: number, msg: string) { super(msg); this.name = "Http"; this.status = status; }
}
try {
  try { throw new Http(404, "nf"); } catch (e) { throw e; }
} catch (e: any) {
  console.log(e.name, e.status, e.message, e instanceof Http, e instanceof Error);
}
`,
  },
  // ===== 第 228 轮补的一批：这一轮修好的两格各配一条 =====
  {
    id: "fn-this-parameter-and-prototype",
    title: "`this` 形参是类型位（不占形参格）+ `Function.prototype` 上的 `call` / `apply` / `bind`",
    src: `
function greet(this: any, a: number, b: number) { return this.tag + ":" + (a + b); }
const o = { tag: "T" };
console.log(greet.call(o, 1, 2), greet.apply(o, [3, 4]));
const bound = greet.bind(o, 10);
console.log(bound(5), bound.call({ tag: "X" }, 100));
const f = function (a: number) { return a * 2; };
console.log(f.call(null, 3), f.apply(null, [4]), typeof greet.call, typeof greet.bind);
`,
  },  {
    id: "exc-throw-in-callback-map-filter",
    title: "回调里抛：`forEach` / `map` / `sort` / `Map.forEach` 都**立刻**中断，外层 `catch` 接得住",
    src: `
let log = "";
try { [1, 2, 3].forEach((v: number) => { if (v === 2) throw new Error("each" + v); log += v; }); }
catch (e: any) { log += "|each:" + e.message; }
try { [1, 2, 3].map((v: number) => { if (v === 2) throw new Error("map" + v); log += v; return v; }); }
catch (e: any) { log += "|map:" + e.message; }
try { [3, 1, 2].sort((a: number, b: number) => { if (b === 2) throw new Error("sort"); return a - b; }); }
catch (e: any) { log += "|sort"; }
const m = new Map<string, number>([["a", 1], ["b", 2]]);
try { m.forEach((v: number, k: string) => { if (k === "b") throw new Error("m" + k); log += k; }); }
catch (e: any) { log += "|mapfor:" + e.message; }
console.log(log);
console.log("after", [1, 2].map((v: number) => v * 2).join(","));
`,
  },
  {
    id: "array-sort-comparator-argument-order",
    title: "`sort` 的比较器按 JS 的次序收到两个实参（顺序错了带副作用的那一族就跟着错）",
    src: `
// **只钉「第一次比较」与「结果」** ✓：比较的**次数与次序**由排序算法决定 ✓
// （本仓是插入排序、V8 是 TimSort ✗）——那一条**不是**可移植的语义 ✓，
// 钉它会变成「钉实现」✗。而「第一个实参是比较器的第一个参数」是**语义** ✓。
let firstPair = "";
let calls = 0;
const xs = [3, 1, 2];
xs.sort((a: number, b: number) => { calls += 1; if (calls === 1) firstPair = a + ":" + b; return a - b; });
console.log(xs.join(","), firstPair);
const ys = [10, 2, 33];
ys.sort((a: number, b: number) => b - a);
console.log(ys.join(","));
const zs = ["b", "c", "a"];
console.log(zs.sort().join(","), [10, 9, 100].sort().join(","));
`,
  },
  {
    id: "exc-catch-then-callbacks-still-run",
    title: "接住一次异常之后，后面的回调**照旧完整跑完**（第 228 轮那条标志位的坑）",
    src: `
try { throw new Error("first"); } catch (e: any) { console.log("caught", e.message); }
console.log([1, 2, 3].map((v: number) => v + 1).join(","));
console.log([1, 2, 3].filter((v: number) => v > 1).join(","));
let n = 0;
try { [1, 2].forEach(() => { n += 1; if (n === 1) throw new Error("x"); }); } catch (e: any) { n += 10; }
console.log("n", n, [5, 6].every((v: number) => v > 0));
`,
  },

  // ============ 第 273 轮加宽（42 条）：把「普通 `.ts` 里常见、此前一条都没盖到」的形状补上 ============
  //
  // 这一批是**普查**收进来的 ✓：先把候选写成一堆独立 `.ts` 交给 `node` 与 `tsrun` 各跑一遍，
  // 只留下**裁判跑得动**（`node` 退出码 0、stdout 非空）的 ✓，然后整批进矩阵 ✓。
  // 量出来的缺口写进 `tests/coverage/expectations.mjs` ✓（每一条一句话说清根子 ✓）。
  // **覆盖率会因为这个分母变大而下降** ✓——那正是这一批的用途：把「90.7%」那个读数
  // 换成一个**分母更诚实**的读数 ✓。
  {
    id: "rt-ref-identity",
    title: "引用同一性：对象按引用相等，改一处两处都变",
    src: `
const a = { n: 1 };
const b = a;
b.n = 2;
const c = { n: 2 };
console.log(a.n, a === b, a === c, a !== c);
const xs = [1, 2];
const ys = xs;
ys.push(3);
console.log(xs.length, xs === ys, xs === [1, 2, 3]);
`,
  },
  {
    id: "rt-nested-structures",
    title: "深层嵌套结构的读写与序列化",
    src: `
const cfg: any = { a: { b: { c: [1, { d: 2 }] } } };
console.log(cfg.a.b.c[1].d);
cfg.a.b.c[1].d = 9;
cfg.x = { y: [3, 4] };
console.log(cfg.a.b.c[1].d, cfg.x.y[1], JSON.stringify(cfg));
`,
  },
  {
    id: "rt-string-building",
    title: "循环里拼字符串：长度与首尾切片",
    src: `
let out = "";
for (let i = 0; i < 200; i++) out += i % 10;
console.log(out.length, out.slice(0, 10), out.slice(-3), out[199]);
`,
  },
  {
    id: "rt-sort-objects-stability",
    title: "对象数组按键排序：比较器拿到的次序与稳定性",
    src: `
const xs = [{ k: 2, v: "a" }, { k: 1, v: "b" }, { k: 2, v: "c" }, { k: 1, v: "d" }];
const sorted = xs.slice().sort((p, q) => p.k - q.k);
console.log(sorted.map((x) => x.v).join(""), sorted.map((x) => x.k).join(","));
console.log(xs.map((x) => x.v).join(""));
`,
  },
  {
    id: "rt-closure-shared",
    title: "两个闭包共享一格：各自实例互不串",
    src: `
function make() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const c1 = make();
const c2 = make();
c1.inc();
c1.inc();
c2.inc();
console.log(c1.get(), c2.get());
`,
  },
  {
    id: "rt-currying",
    title: "柯里化：连着三次调用各带一格",
    src: `
const add = (a: number) => (b: number) => (c: number) => a + b + c;
console.log(add(1)(2)(3), add(10)(20)(30));
const apply2 = (f: (n: number) => number, v: number) => f(v);
console.log(apply2(add(1)(2), 3));
`,
  },
  {
    id: "rt-mutual-recursion",
    title: "互递归：两条函数声明互相调用",
    src: `
function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(10), isOdd(10), isEven(7), isOdd(7));
`,
  },
  {
    id: "rt-generator-return",
    title: "生成器的 return：收尾那一步给的是返回值",
    src: `
function* g(): any { yield 1; yield 2; return "end"; }
const it = g();
const a = it.next();
const b = it.next();
const c = it.next();
const d = it.next();
console.log(a.value, a.done, b.value, b.done, c.value, c.done, d.done);
console.log([...g()].join(","));
`,
  },
  {
    id: "rt-switch-string-fallthrough",
    title: "switch 落在字符串上：贯穿与 default 在中间",
    src: `
function classify(s: string): string {
  let out = "";
  switch (s) {
    case "a":
    case "b": out += "ab"; break;
    case "c": out += "c";
    default: out += "+d";
  }
  return out;
}
console.log(classify("a"), classify("b"), classify("c"), classify("z"));
`,
  },
  {
    id: "rt-nested-finally-order",
    title: "嵌套 try 的 finally 次序：内层先、外层后",
    src: `
function f(): string {
  try {
    try { throw new Error("inner"); } finally { console.log("inner finally"); }
  } catch (e) {
    console.log("caught", (e as Error).message);
  } finally {
    console.log("outer finally");
  }
  return "done";
}
console.log(f());
`,
  },
  {
    id: "rt-throw-primitive-values",
    title: "抛非 Error 的值：字符串 / 数字 / 对象 / null",
    src: `
try { throw "s"; } catch (e) { console.log("str", e, typeof e); }
try { throw 42; } catch (e) { console.log("num", (e as number) + 1); }
try { throw { code: 7 }; } catch (e) { console.log("obj", (e as any).code); }
try { throw null; } catch (e) { console.log("null", e); }
`,
  },
  {
    id: "rt-optional-method-this",
    title: "`o.m?.()`：守的是取出来的方法，`this` 仍是 `o`",
    src: `
const o: any = { n: 5, m() { return this.n * 2; }, z: null };
console.log(o.m?.(), o.z?.(), o.missing?.());
`,
  },
  {
    id: "rt-getter-side-effect-once",
    title: "访问器每次读都算一次（不是缓存）",
    src: `
let n = 0;
const o = { get v() { n++; return n; }, plain: 0 };
console.log(o.v, o.v, o.v, n);
o.plain = 5;
console.log(o.plain, n);
`,
  },
  {
    id: "rt-prototype-chain-create",
    title: "Object.create 的原型链：读穿、`in` 认、keys 不认",
    src: `
const base = { greet() { return "hi " + (this as any).name; }, shared: 1 };
const child: any = Object.create(base);
child.name = "kim";
console.log(child.greet(), child.shared, "shared" in child, Object.keys(child).join(","));
console.log(Object.getPrototypeOf(child) === base, child.hasOwnProperty("shared"));
`,
  },
  {
    id: "rt-delete-and-in",
    title: "delete 一个属性之后：`in`、keys、再 delete",
    src: `
const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, Object.keys(o).join(","));
console.log(delete o.zzz, o.b);
delete o["b"];
console.log(Object.keys(o).length);
`,
  },
  {
    id: "rt-array-hole-semantics",
    title: "稀疏数组的洞：length 算、forEach / map 跳过",
    src: `
const xs: any[] = [1, , 3];
console.log(xs.length, xs[1], 1 in xs, 2 in xs);
let seen = "";
xs.forEach((v, i) => { seen += i + ":" + v + " "; });
console.log(seen.trim());
console.log(xs.map((v) => v).length, xs.filter(() => true).length);
`,
  },
  {
    id: "rt-loose-eq-null-undefined",
    title: "`==` 的强制转换表：null / undefined / 空串 / 数组",
    src: `
console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log("" == 0, "1" == 1, "  " == 0, [] == false, [1] == 1, [1, 2] == "1,2");
console.log(NaN == NaN, NaN === NaN);
`,
  },
  {
    id: "rt-coercion-table",
    title: "`+` 与 `-` 的强制转换：数组 / 对象 / 布尔 / null",
    src: `
console.log([] + {}, [] + [], [1] + [2], 1 + "2", "3" - 1, "3" * "2");
console.log(true + 1, null + 1, undefined + 1, +true, +"");
console.log([] ? "truthy" : "falsy", ({} ? "t" : "f"));
`,
  },
  {
    id: "rt-object-key-order",
    title: "属性的枚举顺序：整数键在前且升序，其余按写入",
    src: `
const o: any = { b: 1, 2: 2, a: 3, 1: 4, c: 5 };
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(Object.keys(o)));
const p: any = {};
p.z = 1;
p[0] = 2;
p.y = 3;
console.log(Object.keys(p).join(","));
`,
  },
  {
    id: "rt-symbol-as-key",
    title: "符号当键：读得到、不算进 keys / JSON",
    src: `
const s = Symbol("k");
const o: any = { [s]: 1, a: 2 };
console.log(o[s], Object.keys(o).join(","), JSON.stringify(o));
console.log("a" in o, typeof s);
`,
  },
  {
    id: "rt-map-object-keys",
    title: "Map 用对象当键：按引用认",
    src: `
const m = new Map<any, string>();
const k1: any = { id: 1 };
const k2: any = { id: 1 };
m.set(k1, "a");
m.set(k2, "b");
console.log(m.get(k1), m.get(k2), m.get({ id: 1 }), m.size);
m.set(k1, "c");
console.log(m.get(k1), m.size);
`,
  },
  {
    id: "rt-set-dedupe-nan-zero",
    title: "Set 的去重口径：NaN 与 -0",
    src: `
const s = new Set<any>([NaN, NaN, 0, -0, "0", 0]);
console.log(s.size, s.has(NaN), s.has(0), s.has(-0), s.has("0"));
const t = new Set<number>([1, 2, 2, 3, 1]);
console.log([...t].join(","));
`,
  },
  {
    id: "rt-var-shared-in-loop",
    title: "`var` 每轮共享一格（与 `let` 对照）",
    src: `
const fns: any[] = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
const lets: any[] = [];
for (let j = 0; j < 3; j++) lets.push(() => j);
console.log(lets.map((f) => f()).join(","));
`,
  },
  {
    id: "rt-void-comma-operators",
    title: "`,` 与 `void`：求值次序与结果值",
    src: `
let a = 0;
const b = (a = 1, a + 1);
console.log(b, a);
const c = (a = 5, a = 6, a);
console.log(c, a, void 0, typeof void 0);
`,
  },
  {
    id: "rt-typeof-all-kinds",
    title: "typeof 每一种值（含类表达式）",
    src: `
console.log(typeof 1, typeof "s", typeof true, typeof undefined, typeof null);
console.log(typeof {}, typeof [], typeof (() => 1), typeof Symbol("x"));
const f = function named() { return 1; };
console.log(typeof f, typeof class C { }, typeof console.log);
`,
  },
  {
    id: "rt-numeric-precision",
    title: "浮点的位与十进制往返",
    src: `
console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3);
console.log(1 / 3, (1 / 3).toFixed(10), 1e21, 1e-7, 123456789012345678901234567890);
console.log(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
`,
  },
  {
    id: "rt-surrogate-iteration",
    title: "代理对：for..of 一次一个码点，下标一次一个码元",
    src: `
const s = "a\\u{1F600}b";
console.log(s.length, [...s].length, Array.from(s).length);
const seen: string[] = [];
for (const ch of s) seen.push(ch);
console.log(seen.length, seen[1].length);
console.log(s[1].length);
`,
  },
  {
    id: "rt-default-param-earlier",
    title: "默认值可以引用前面的形参，也可以调函数",
    src: `
function f(a: number, b: number = a * 2, c: string = "c" + b): string { return a + "/" + b + "/" + c; }
console.log(f(1), f(1, 5), f(1, undefined, "z"));
function g(x: number, y: number = h(x)): number { return y; }
function h(n: number): number { return n + 100; }
console.log(g(1), g(1, 2));
`,
  },
  {
    id: "rt-spread-multiple-args",
    title: "一次调用里展开两处，外加普通实参",
    src: `
function f(...xs: any[]): string { return xs.join("|"); }
const a = [1, 2];
const b = [3, 4];
console.log(f(...a, 9, ...b));
console.log(f(0, ...a, ...b, 5));
console.log(Math.max(...a, ...b, 100));
console.log([...a, ...b, 7].join(","));
`,
  },
  {
    id: "rt-object-spread-order",
    title: "对象展开的覆盖次序：后写的赢",
    src: `
const base = { a: 1, b: 2 };
const over: any = { ...base, b: 3, c: 4 };
console.log(JSON.stringify(over), Object.keys(over).join(","));
const back: any = { b: 3, ...base };
console.log(JSON.stringify(back));
const copy: any = { ...base };
console.log(copy !== base, copy.a);
`,
  },
  {
    id: "rt-static-inheritance",
    title: "静态成员随继承走：`this` 是那一个类",
    src: `
class A {
  static tag = "A";
  static make(): string { return "made:" + this.tag; }
}
class B extends A {
  static tag = "B";
}
console.log(A.make(), B.make(), B.tag, A.tag);
`,
  },
  {
    id: "rt-instanceof-primitives",
    title: "instanceof 对原始值与内建",
    src: `
console.log(1 instanceof Number, "s" instanceof String, true instanceof Boolean);
console.log([] instanceof Array, [] instanceof Object, {} instanceof Object);
console.log((() => 1) instanceof Function, null instanceof Object);
`,
  },
  {
    id: "rt-reiterable-protocol",
    title: "自定义可迭代对象要能反复迭代（每次给新迭代器）",
    src: `
class Range {
  lo: number;
  hi: number;
  constructor(lo: number, hi: number) { this.lo = lo; this.hi = hi; }
  [Symbol.iterator](): any {
    let i = this.lo;
    const hi = this.hi;
    return { next: () => (i <= hi ? { value: i++, done: false } : { value: 0, done: true }) };
  }
}
const r = new Range(1, 4);
console.log([...r].join(","), [...r].join(","));
let sum = 0;
for (const v of r) sum += v;
console.log(sum);
`,
  },
  {
    id: "rt-large-array-pipeline",
    title: "500 个元素的 filter / map / reduce 流水线",
    src: `
const xs: number[] = [];
for (let i = 0; i < 500; i++) xs.push(i);
const squares = xs.filter((v) => v % 3 === 0).map((v) => v * v);
console.log(xs.length, squares.length, squares[0], squares[squares.length - 1]);
console.log(xs.reduce((a, b) => a + b, 0), squares.reduce((a, b) => a + b, 0));
`,
  },
  {
    id: "rt-recursive-data-walk",
    title: "递归走一棵树，用 reduce + concat 收集路径",
    src: `
type Node = { name: string; kids: Node[] };
const tree: Node = {
  name: "root",
  kids: [{ name: "a", kids: [] }, { name: "b", kids: [{ name: "c", kids: [] }] }],
};
function paths(n: Node, prefix: string): string[] {
  const here = prefix + n.name;
  if (n.kids.length === 0) return [here];
  return n.kids.reduce((acc, k) => acc.concat(paths(k, here + "/")), [] as string[]);
}
console.log(paths(tree, "").join(" "));
`,
  },
  {
    id: "rt-error-custom-fields",
    title: "自定义错误：字段、name、instanceof、String(e)",
    src: `
class ValidationError extends Error {
  field: string;
  constructor(field: string, msg: string) {
    super(msg);
    this.name = "ValidationError";
    this.field = field;
  }
}
const e = new ValidationError("age", "too young");
console.log(e.message, e.field, e.name);
console.log(String(e));
console.log(e instanceof ValidationError, e instanceof Error);
try { throw e; } catch (x) { console.log((x as ValidationError).field, (x as Error).message); }
`,
  },
  {
    id: "rt-multi-return-object",
    title: "用一个对象返回多个值（含解构那一半）",
    src: `
function divmod(a: number, b: number): { q: number; r: number } {
  return { q: Math.floor(a / b), r: a % b };
}
const { q, r } = divmod(17, 5);
console.log(q, r, divmod(17, 5).r, divmod(-7, 3).q, divmod(-7, 3).r);
`,
  },
  {
    id: "rt-nested-destructure-deep",
    title: "深层解构：对象里套数组、数组里套对象、默认值",
    src: `
const data: any = { user: { name: "kim", tags: ["x", "y"] }, counts: [[1, 2], [3]] };
const { user: { name, tags: [first, ...restTags] }, counts: [[a, b], [c]] } = data;
console.log(name, first, restTags.join(""), a + b + c);
const { missing: { deep = "dflt" } = {} } = data;
console.log(deep);
const [x = 1, y = 2, z = 3] = [undefined, 9];
console.log(x, y, z);
`,
  },
  {
    id: "rt-class-getter-static-and-inherit",
    title: "静态访问器与继承下来的静态访问器",
    src: `
class A {
  static get kind(): string { return "A-static"; }
  get own(): string { return "own"; }
}
class B extends A {
  static get kind(): string { return "B+" + super.kind; }
}
console.log(B.kind, new B().own, new A().own);
`,
  },
  {
    id: "rt-method-this-via-call",
    title: "普通函数借 `call` / `apply` / `bind` 换 `this`",
    src: `
function who(this: any, suffix: string): string { return this.name + suffix; }
console.log(who.call({ name: "kim" }, "!"));
console.log(who.apply({ name: "lee" }, ["?"]));
const bound = who.bind({ name: "park" });
console.log(bound("."));
`,
  },
  {
    id: "rt-array-nested-mutation",
    title: "二维数组的按行改与整体观察",
    src: `
const grid: number[][] = [[1, 2], [3, 4]];
grid[0][1] = 9;
grid.push([5, 6]);
console.log(JSON.stringify(grid));
const copy = grid.slice();
copy[0][0] = 100;
console.log(grid[0][0], copy[0][0], grid === copy);
`,
  },
  {
    id: "rt-deep-call-chain",
    title: "连着调用 / 连着取属性的长链",
    src: `
const o: any = { a: { b: { c: { d: () => ({ e: [1, 2, 3] }) } } } };
console.log(o.a.b.c.d().e.length, o.a.b.c.d().e[2]);
const f = (n: number) => (m: number) => (k: number) => n + m + k;
console.log(f(1)(2)(3));
`,
  },

  // ============ 第 287 轮加宽（引擎：控制流 / 闭包 / 对象 / 原型 / 生成器 / 强制转换） ============
  {
    id: "rt-for-no-parts",
    title: "for(;;) 三段全省略 + break 出口",
    src: `
let n = 0;
for (;;) { n += 1; if (n >= 3) break; }
console.log(n);
for (let i = 0; ; i++) { if (i === 2) { console.log("c", i); break; } }
`,
  },
  {
    id: "rt-for-comma-parts",
    title: "for 头部里的逗号运算符（初始化与步进各两个）",
    src: `
for (let i = 0, j = 5; i < j; i++, j--) console.log(i, j);
let a = 0, b = 0;
for (a = 1, b = 2; a < 4; a += 1, b += 10) console.log(a, b);
`,
  },
  {
    id: "rt-do-while-runs-once",
    title: "do..while 至少跑一次（条件一开始就是假）",
    src: `
let n = 0;
do { n += 1; } while (false);
console.log(n);
let m = 10;
do { m -= 3; } while (m > 0);
console.log(m);
`,
  },
  {
    id: "rt-while-continue-progress",
    title: "while 里的 continue 要走到步进那一句（否则死循环）",
    src: `
let i = 0;
let seen: number[] = [];
while (i < 6) { i += 1; if (i % 2 === 0) continue; seen.push(i); }
console.log(seen.join(","), i);
`,
  },
  {
    id: "rt-label-continue-outer",
    title: "带标签的 continue 跳到外层循环的步进",
    src: `
const out: string[] = [];
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    out.push(i + ":" + j);
  }
}
console.log(out.join(" "));
`,
  },
  {
    id: "rt-label-break-out-of-block",
    title: "带标签的块：break 标签直接跳出整块",
    src: `
let hits = 0;
block: {
  hits += 1;
  if (hits === 1) break block;
  hits += 100;
}
console.log(hits);
`,
  },
  {
    id: "rt-switch-default-first",
    title: "default 写在最前面：仍然从匹配的 case 进、顺序走到底",
    src: `
function pick(n: number) {
  switch (n) {
    default: return "d";
    case 1: return "one";
    case 2: return "two";
  }
}
console.log(pick(1), pick(2), pick(9));
`,
  },
  {
    id: "rt-switch-strict-compare",
    title: "switch 用的是 ===（字符串与数字不相等）",
    src: `
function name(n: any) {
  switch (n) {
    case 1: return "num";
    case "1": return "str";
    default: return "other";
  }
}
console.log(name(1), name("1"), name(true));
`,
  },
  {
    id: "rt-switch-fallthrough-group",
    title: "多个 case 共用一个体（不写 break 的分组）",
    src: `
function kind(c: string) {
  switch (c) {
    case "a":
    case "e":
    case "i":
      return "vowel";
    case "b":
      return "cons";
    default:
      return "?";
  }
}
console.log(kind("a"), kind("e"), kind("b"), kind("z"));
`,
  },
  {
    id: "rt-switch-scoped-declaration",
    title: "switch 体里花括号声明与 break 的配合",
    src: `
function f(n: number) {
  let out = "";
  switch (n) {
    case 1: {
      const label = "one";
      out += label;
      break;
    }
    case 2:
      out += "two";
      break;
    default:
      out += "many";
  }
  return out;
}
console.log(f(1), f(2), f(7));
`,
  },
  {
    id: "rt-throw-in-loop-caught",
    title: "循环里抛、循环外接住：循环中断且变量停在中途",
    src: `
let i = 0;
try { for (i = 0; i < 5; i++) { if (i === 3) throw new Error("stop"); } } catch (e: any) { console.log("caught", e.message, i); }
console.log("after", i);
`,
  },
  {
    id: "rt-throw-null-and-object",
    title: "抛 null / 抛对象 / 抛数字，catch 拿到的是原样那个值",
    src: `
function probe(v: any) { try { throw v; } catch (e: any) { return e === v ? "same" : "other"; } }
console.log(probe(null), probe(undefined), probe(0), probe(""), probe(false));
const obj = { tag: 1 };
try { throw obj; } catch (e: any) { console.log(e === obj, e.tag); }
`,
  },
  {
    id: "rt-finally-throw-wins",
    title: "finally 里抛：盖过 try 里的 return",
    src: `
function f() {
  try { return "try"; } finally { throw new Error("boom"); }
}
try { f(); } catch (e: any) { console.log("caught", e.message); }
`,
  },
  {
    id: "rt-finally-overrides-return",
    title: "finally 里有 return：盖过 try / catch 的返回值",
    src: `
function a() { try { return 1; } finally { return 2; } }
function b() { try { throw new Error("x"); } catch { return 3; } finally { return 4; } }
console.log(a(), b());
`,
  },
  {
    id: "rt-finally-no-return-keeps",
    title: "finally 只跑副作用、没有 return：原返回值不变",
    src: `
const log: string[] = [];
function f() { try { log.push("t"); return "v"; } finally { log.push("f"); } }
console.log(f(), log.join(","));
`,
  },
  {
    id: "rt-iife-forms",
    title: "三种立即调用：函数表达式 / 箭头 / 带实参",
    src: `
console.log((function () { return "fn"; })());
console.log((() => "arrow")());
console.log(((a: number, b: number) => a + b)(2, 3));
console.log((function (n: number) { return n * 2; })(21));
`,
  },
  {
    id: "rt-default-param-order",
    title: "默认参数：从左到右求值、能看见前面的实参",
    src: `
function f(a: number, b = a * 2, c = b + 1) { return [a, b, c].join(","); }
console.log(f(1), f(1, 5), f(1, 5, 9), f(3, undefined, 0));
`,
  },
  {
    id: "rt-rest-and-spread-arity",
    title: "剩余参数收尾 · 展开传参 · 空剩余",
    src: `
function f(first: number, ...rest: number[]) { return first + "/" + rest.length + "/" + rest.join("+"); }
console.log(f(1), f(1, 2), f(1, 2, 3, 4));
const xs = [1, 2, 3];
console.log(Math.max(...xs), Math.max(0, ...xs, 9));
`,
  },
  {
    id: "rt-loop-capture-let-vs-var",
    title: "循环变量捕获：let 每个迭代一个、var 共用一个",
    src: `
const fns: Array<() => number> = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
const gns: Array<() => number> = [];
for (var j = 0; j < 3; j++) gns.push(() => j);
console.log(gns.map((f) => f()).join(","));
`,
  },
  {
    id: "rt-nested-closure-counter",
    title: "闭包共享同一格：两个计数器各算各的",
    src: `
function counter() { let n = 0; return { inc: () => ++n, get: () => n }; }
const a = counter();
const b = counter();
a.inc(); a.inc(); b.inc();
console.log(a.get(), b.get());
`,
  },
  {
    id: "rt-object-method-shorthand",
    title: "对象字面量：简写方法、简写属性、计算键",
    src: `
const name = "world";
const key = "dyn";
const o = {
  name,
  greet() { return "hi " + this.name; },
  [key + "1"]: 7,
  "quoted key": true,
  nested: { deep: { value: 1 } },
};
console.log(o.greet(), o.dyn1, o["quoted key"], o.nested.deep.value);
`,
  },
  {
    id: "rt-getter-setter-side-effects",
    title: "访问器：读一次跑一次、写一次跑一次",
    src: `
let reads = 0;
let writes = 0;
let store = 0;
const o = {
  get v() { reads += 1; return store; },
  set v(next: number) { writes += 1; store = next; },
};
o.v = 5;
const got = o.v + o.v;
console.log(got, reads, writes, store);
`,
  },
  {
    id: "rt-prototype-lookup-chain",
    title: "原型链查找：三级、遮蔽、缺失给 undefined",
    src: `
const base = { a: 1, b: 2 };
const mid = Object.create(base);
mid.b = 20;
const leaf = Object.create(mid);
leaf.c = 3;
console.log(leaf.a, leaf.b, leaf.c, leaf.nope);
console.log(Object.getPrototypeOf(leaf) === mid, Object.getPrototypeOf(base) === Object.prototype);
`,
  },
  {
    id: "rt-array-holes-map-skip",
    title: "稀疏数组：map / forEach 跳过洞、join 把洞当空",
    src: `
const xs = [1, , 3];
let visits = 0;
const mapped = xs.map((v) => { visits += 1; return v * 2; });
console.log(xs.length, visits, mapped.join("|"), mapped.length, 1 in xs, 1 in mapped);
xs.forEach(() => { visits += 1; });
console.log(visits);
`,
  },
  {
    id: "rt-array-length-truncate",
    title: "给 length 赋一个更小的值：尾巴真的没了",
    src: `
const xs = [1, 2, 3, 4, 5];
xs.length = 2;
console.log(xs.join(","), xs.length, xs[2]);
xs.length = 4;
console.log(xs.join("|"), xs.length);
`,
  },
  {
    id: "rt-string-to-number-coercion",
    title: "字符串与数字的算术语义：空串是 0、空白是 0、非数字是 NaN",
    src: `
console.log("" * 1, "  " * 1, "12" * 2, "12px" * 2, true * 1, null * 1);
console.log(undefined * 1, [5] * 1, [1, 2] * 1, [] * 1);
console.log(+"3.5", +"-0", +"0x10", +"1e3");
`,
  },
  {
    id: "rt-relational-string-vs-number",
    title: "关系比较：两个字符串按码元、其余转数字",
    src: `
console.log("10" < "9", "10" < 9, "abc" < "abd", "Z" < "a");
console.log(null < 1, null >= 0, undefined < 1, NaN < 1, NaN >= 1);
`,
  },
  {
    id: "rt-plus-array-and-object",
    title: "`+` 的 ToPrimitive：数组拼逗号、对象给 [object Object]",
    src: `
console.log([1, 2] + [3], [] + {}, ({}) + "", 1 + [2], "x" + [1, 2]);
console.log({ valueOf: () => 7 } + 1, { toString: () => "T" } + "!");
`,
  },
  {
    id: "rt-unary-conversions",
    title: "一元运算：+ - ! void typeof 在一批值上的结果",
    src: `
console.log(+"", +"x", -"3", -true, !0, !"", ![], !{}, !!null);
console.log(void 0, typeof void 0, typeof null, typeof [], typeof (() => 0));
`,
  },
  {
    id: "rt-bitwise-negative-and-shift",
    title: "位运算在负数上：& | ^ << >> >>>",
    src: `
console.log(-1 & 0xff, -8 >> 1, -8 >>> 28, 1 << 31, (-1 >>> 0) === 4294967295);
console.log(5 ^ 3, ~0, ~5, 0x7fffffff | 0, (1 << 31) | 0);
console.log(3.9 | 0, -3.9 | 0, NaN | 0, Infinity | 0);
`,
  },
  {
    id: "rt-modulo-and-sign",
    title: "取模与除法的符号纪律：% 跟被除数、/ 给 ±Infinity",
    src: `
console.log(7 % 3, -7 % 3, 7 % -3, -7 % -3);
console.log(1 / 0, -1 / 0, 0 / 0, 1 / -0 === -Infinity);
console.log(5 % 0, 0 % 5, (-5) % 2);
`,
  },
  {
    id: "rt-string-index-write-ignored",
    title: "给字符串下标赋值：静默无效（松散模式）",
    src: `
const s = "abc";
(s as any)[0] = "z";
console.log(s, s[0], s.length);
const boxed = new String("xy");
(boxed as any)[0] = "q";
console.log(boxed.toString());
`,
  },
  {
    id: "rt-delete-array-element",
    title: "delete 数组元素留洞、delete 对象属性真的没有",
    src: `
const xs = [1, 2, 3];
delete xs[1];
console.log(xs.length, xs.join("|"), 1 in xs, xs[1]);
const o: any = { a: 1, b: 2 };
console.log(delete o.a, delete o.zzz, "a" in o, Object.keys(o).join(","));
`,
  },
  {
    id: "rt-instanceof-custom",
    title: "instanceof 认 Symbol.hasInstance（静态方法优先）",
    src: `
class Even {
  static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
}
console.log(2 instanceof Even, 3 instanceof Even, "2" instanceof Even);
`,
  },
  {
    id: "rt-new-without-parens",
    title: "new 不带括号 / new 一个表达式给出的构造函数",
    src: `
class Box { v = 5; }
const a = new Box;
console.log(a.v);
const ctor = Box;
const b = new ctor();
console.log(b.v, b instanceof Box);
console.log(new Date(0).getTime());
`,
  },
  {
    id: "rt-ctor-return-rules",
    title: "构造函数返回对象会顶替 this、返回原始值被忽略",
    src: `
function A(this: any) { this.v = 1; return { v: 99 }; }
function B(this: any) { this.v = 2; return 42; }
const a: any = new (A as any)();
const b: any = new (B as any)();
console.log(a.v, b.v);
`,
  },
  {
    id: "rt-class-expr-and-static-this",
    title: "类表达式赋值给常量 · 静态方法里的 this 是构造函数",
    src: `
const C = class Named { static who() { return this.name; } };
console.log(C.who());
C.name = "Renamed";
console.log(C.who());
`,
  },
  {
    id: "rt-super-method-chain",
    title: "super 方法调用：两层各加一段、this 一直是子类实例",
    src: `
class A { tag() { return "A"; } who() { return "who-" + this.tag(); } }
class B extends A { tag() { return "B" + super.tag(); } }
class C extends B { tag() { return "C" + super.tag(); } }
console.log(new C().tag(), new C().who());
`,
  },
  {
    id: "rt-accessor-override",
    title: "访问器覆盖：子类 getter 调 super 的 getter",
    src: `
class Base {
  #v = 1;
  get value() { return this.#v; }
  set value(next: number) { this.#v = next; }
}
class Doubled extends Base {
  get value() { return super.value * 2; }
  set value(next: number) { super.value = next; }
}
const d = new Doubled();
d.value = 21;
console.log(d.value, Object.getPrototypeOf(Doubled.prototype) === Base.prototype);
`,
  },
  {
    id: "rt-custom-iterable-object",
    title: "自定义可迭代对象：Symbol.iterator 返回带 next 的对象",
    src: `
const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let n = this.from;
    const last = this.to;
    return { next: () => (n <= last ? { value: n++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...range].join(","));
const out: number[] = [];
for (const v of range) out.push(v * 10);
console.log(out.join(","));
`,
  },
  {
    id: "rt-generator-return-early",
    title: "生成器：提前 return 收尾、finally 照跑",
    src: `
function* g() {
  try { yield 1; yield 2; } finally { console.log("cleanup"); }
}
const it = g();
console.log(it.next().value);
console.log(it.return(9).value, it.next().done);
`,
  },
  {
    id: "rt-generator-throw-into",
    title: "往生成器里 throw：体内 catch 接住、还能继续 yield",
    src: `
function* g() {
  try { yield "a"; } catch (e: any) { yield "caught:" + e.message; }
  yield "end";
}
const it = g();
console.log(it.next().value);
console.log(it.throw(new Error("in")).value);
console.log(it.next().value, it.next().done);
`,
  },
  {
    id: "rt-map-mutation-during-iteration",
    title: "遍历 Map 时删掉当前项：不跳过后一项",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k, v] of m) { seen.push(k + v); if (k === "a") m.delete("a"); }
console.log(seen.join(","), m.size);
`,
  },
  {
    id: "rt-set-object-identity",
    title: "Set 去重按引用：两个一样的对象是两个元素",
    src: `
const o1 = { v: 1 };
const o2 = { v: 1 };
const s = new Set<any>([o1, o2, o1, 1, 1, NaN, NaN, 0, -0]);
console.log(s.size, s.has(o1), s.has({ v: 1 }));
`,
  },
  {
    id: "rt-json-nested-roundtrip",
    title: "JSON 往返：嵌套结构、特殊字符、数字形状",
    src: `
const value = { a: [1, { b: "x\\ny" }, null], c: true, d: 1.5, e: -0 };
const text = JSON.stringify(value);
const back: any = JSON.parse(text);
console.log(text);
console.log(back.a[1].b === "x\\ny", back.e === 0, 1 / back.e === -Infinity, Array.isArray(back.a));
`,
  },
  {
    id: "rt-optional-chain-null-base",
    title: "可选链在中途 null / undefined 上短路整条链",
    src: `
const o: any = { a: { b: null } };
console.log(o?.a?.b?.c, o?.x?.y, o.a.b?.c, o?.a?.b);
const f: any = null;
console.log(f?.(), f?.[0], f?.p);
console.log(o?.a?.b ?? "fallback");
`,
  },
  {
    id: "rt-nullish-vs-or",
    title: "?? 只在 null / undefined 上换路、|| 在假值上换路",
    src: `
const values: any[] = [0, "", false, NaN, null, undefined, 1];
for (const v of values) console.log(v ?? "d", v || "d");
`,
  },
  {
    id: "rt-assignment-chain-and-ops",
    title: "赋值链的返回值、复合赋值的返回值",
    src: `
let a = 1, b = 2, c = 3;
a = b = c = 9;
console.log(a, b, c);
let s = "x";
console.log(s += "y", s);
let n = 10;
console.log(n -= 4, n *= 2, n /= 3, n %= 4, n);
`,
  },
  {
    id: "rt-logical-side-effects",
    title: "逻辑短路：右边到底跑没跑",
    src: `
let calls = 0;
const hit = () => { calls += 1; return true; };
const miss = () => { calls += 1; return false; };
console.log(false && hit(), true || hit(), true && hit(), false || hit());
console.log(null ?? hit(), 0 ?? hit());
console.log(calls);
`,
  },
  {
    id: "rt-comma-and-void",
    title: "逗号运算符与 void：只留最后一个 / 一律 undefined",
    src: `
let n = 0;
const v = (n += 1, n += 2, n);
console.log(v, n);
console.log(void (n += 10), n);
`,
  },
  {
    id: "rt-ternary-nesting-and-assign",
    title: "三元嵌套与三元里的赋值",
    src: `
function grade(n: number) { return n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : "F"; }
console.log(grade(95), grade(85), grade(75), grade(10));
let flag = false;
const r = flag ? (flag = false) : (flag = true);
console.log(r, flag);
`,
  },
  {
    id: "rt-str-methods-on-primitive",
    title: "原始值上直接调方法：每次读都拿到一个新的包装",
    src: `
const s = "Hello World";
console.log(s.toUpperCase(), s.slice(0, 5), s.indexOf("o"), s.split(" ").length);
const n = 1234.5678;
console.log(n.toFixed(2), n.toString().length);
const b = true;
console.log(b.toString(), b.valueOf());
`,
  },
  {
    id: "rt-deep-recursion-return",
    title: "深递归：回程顺序与累加",
    src: `
function down(n: number, acc: string[]): string[] { if (n === 0) return acc; acc.push("in" + n); down(n - 1, acc); acc.push("out" + n); return acc; }
console.log(down(4, []).join(" "));
function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
console.log(fact(6), fact(10));
`,
  },
  {
    id: "rt-new-array-forms",
    title: "new Array 的三种形态：空、长度、元素列表",
    src: `
const a = new Array();
const b = new Array(3);
const c = new Array(1, 2);
console.log(a.length, b.length, b.join("|"), c.length, c.join(","));
console.log(Array.isArray(a), Array.isArray(b));
`,
  },
  {
    id: "rt-error-fields-and-name",
    title: "Error 的 name / message / toString 与自定义子类",
    src: `
const e = new Error("boom");
console.log(e.name, e.message, e.toString());
const t = new TypeError("bad");
console.log(t.name, t instanceof Error, t instanceof TypeError, t.toString());
class MyError extends Error { constructor(m: string) { super(m); this.name = "MyError"; } }
const m = new MyError("mine");
console.log(m.name, m.message, m.toString(), m instanceof Error, m instanceof MyError);
`,
  },
  {
    id: "rt-IIFE-module-scope",
    title: "用立即调用函数圈一块作用域：内外同名互不影响",
    src: `
const value = "outer";
const inner = (function () { const value = "inner"; return value; })();
console.log(value, inner);
const counter = (() => { let n = 0; return () => ++n; })();
counter(); counter();
console.log(counter());
`,
  },

  {
    id: "rt-arguments-object",
    title: "arguments：length / 下标 / 箭头里看外层那一份",
    src: `
function f(a: number, b: number) {
  console.log(arguments.length, arguments[0], arguments[1], arguments[5]);
}
f(1, 2);
f(1, 2, 3, 4, 5, 6);
function g() {
  const inner = () => arguments.length;
  console.log(inner());
}
g(1, 2, 3);
`,
  },
  {
    id: "rt-arguments-vs-rest",
    title: "arguments 与剩余形参同时存在",
    src: `
function f(a: number, ...rest: number[]) {
  return rest.join("+") + ":" + arguments.length;
}
console.log(f(1, 2, 3), f(1), f());
`,
  },
  {
    id: "rt-forin-order-and-inherited",
    title: "for..in：整数键在前、继承来的键也在、数组给下标串",
    src: `
const o: any = { b: 1, a: 2 };
o[2] = "two";
o[1] = "one";
const keys: string[] = [];
for (const k in o) keys.push(k);
console.log(keys.join(","));
const arr = ["x", "y"];
const idx: string[] = [];
for (const i in arr) idx.push(i);
console.log(idx.join(","));
const child: any = Object.create({ inherited: true });
child.own = 1;
const both: string[] = [];
for (const k in child) both.push(k);
console.log(both.join(","));
`,
  },
  {
    id: "rt-generator-next-sends-value",
    title: "生成器：next(v) 把值送进挂起点",
    src: `
function* g() {
  const a = yield 1;
  const b = yield a + 1;
  return a + b;
}
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(20)));
`,
  },
  {
    id: "rt-generator-next-arg-ignored-first",
    title: "生成器：第一次 next 的实参被丢掉",
    src: `
function* g() {
  const a = yield "start";
  console.log("got", a);
}
const it = g();
console.log(JSON.stringify(it.next(99)));
console.log(JSON.stringify(it.next(7)));
`,
  },
  {
    id: "rt-delete-object-property",
    title: "delete 对象属性：删掉、in 变假、读回 undefined",
    src: `
const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, o.a, Object.keys(o).join(","));
console.log(delete o.missing);
`,
  },
  {
    id: "rt-prototype-chain-create-depth",
    title: "Object.create 串三层：读沿链走、keys 只看自己",
    src: `
const base = { a: 1 };
const mid: any = Object.create(base);
mid.b = 2;
const leaf: any = Object.create(mid);
leaf.c = 3;
console.log(leaf.a, leaf.b, leaf.c);
console.log(Object.keys(leaf).join(","), "a" in leaf, leaf.hasOwnProperty("a"), leaf.hasOwnProperty("c"));
`,
  },
  {
    id: "rt-try-continue-finally",
    title: "循环里 try/finally 夹着 continue：finally 照跑",
    src: `
const out: number[] = [];
for (let i = 0; i < 5; i++) {
  try {
    if (i % 2) continue;
    out.push(i);
  } finally {
    out.push(100 + i);
  }
}
console.log(out.join(","));
`,
  },
  {
    id: "rt-labeled-continue-forof",
    title: "for..of 套 for..of：continue 跳到外层那一个",
    src: `
const out: string[] = [];
outer: for (const a of [1, 2]) {
  for (const b of [1, 2]) {
    if (b === 2) continue outer;
    out.push(a + "-" + b);
  }
}
console.log(out.join(","));
`,
  },
  {
    id: "rt-nested-destructure-defaults",
    title: "嵌套解构 + 默认值 + 数组洞",
    src: `
const cfg: any = { a: { b: [1, , 3] } };
const { a: { b: [x, y = 9, z] } } = cfg;
console.log(x, y, z);
const [, second = "s", ...rest] = ["first", undefined, "third", "fourth"];
console.log(second, rest.join(","));
`,
  },
  {
    id: "rt-error-in-getter-caught",
    title: "getter 里抛：try 接得住、类别还在",
    src: `
const o = {
  get boom(): number {
    throw new Error("bad");
  },
};
try {
  console.log(o.boom);
} catch (e) {
  console.log(e instanceof Error, (e as Error).message);
}
console.log("after");
`,
  },
  {
    id: "rt-recursive-tree-reduce",
    title: "递归走树：reduce 累积 + 闭包内自引用",
    src: `
type N = { v: number; kids: N[] };
const tree: N = { v: 1, kids: [{ v: 2, kids: [] }, { v: 3, kids: [{ v: 4, kids: [] }] }] };
const sum = (n: N): number => n.v + n.kids.reduce((acc, k) => acc + sum(k), 0);
console.log(sum(tree));
`,
  },
  {
    id: "rt-class-static-accessor",
    title: "静态 getter / setter 与它们背后的字段",
    src: `
class C {
  static _v = 1;
  static get v(): number {
    return C._v * 2;
  }
  static set v(x: number) {
    C._v = x;
  }
}
console.log(C.v);
C.v = 5;
console.log(C.v, C._v);
`,
  },
  {
    id: "rt-switch-scoped-case-block",
    title: "switch 的 case 里开一个块：作用域不串",
    src: `
function f(n: number): string {
  switch (n) {
    case 1: {
      const t = "one";
      return t;
    }
    case 2: {
      const t = "two";
      return t;
    }
    default:
      return "other";
  }
}
console.log(f(1), f(2), f(3));
`,
  },
  {
    id: "rt-array-hole-in-operator",
    title: "数组的洞：in 是假、join 空、JSON 变 null",
    src: `
const xs: any[] = [1, , 3];
console.log(1 in xs, 0 in xs, xs.length, xs.join("|"), JSON.stringify(xs));
`,
  },
  {
    id: "rt-symbol-key-excluded-from-keys",
    title: "符号键：不进制符串键表、能读回来",
    src: `
const s = Symbol("k");
const o: any = { a: 1, [s]: 2 };
console.log(Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length, o[s]);
`,
  },
  {
    id: "rt-closure-object-pair",
    title: "闭包成对：一个改、一个读",
    src: `
function counter() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const c = counter();
c.inc();
c.inc();
console.log(c.get());
const d = counter();
console.log(d.get(), c.get());
`,
  },
  {
    id: "rt-optional-call-on-method",
    title: "o.m?.()：方法取出来是 null 就不调",
    src: `
const o: any = { m: () => "called", n: null };
console.log(o.m?.(), o.n?.());
`,
  },
  {
    id: "rt-logical-assign-forms",
    title: "||= / &&= / ??= 的短路与返回值",
    src: `
let a: number | null = null;
console.log((a ??= 5), a);
let b = 1;
console.log((b ||= 2), b);
let c = 0;
console.log((c &&= 3), c);
let d: any = { n: 0 };
console.log((d.n ||= 7), d.n);
`,
  },
  {
    id: "rt-number-string-forms",
    title: "数字转字符串：大数、小数、指数、负零",
    src: `
console.log(String(1e21), String(1e-7), String(-0), (1234.5678).toString(), (0.1 + 0.2).toString());
console.log((255).toString(16), (8).toString(2), (-0).toString(), Object.is(-0, -0));
`,
  },
  {
    id: "rt-do-while-break-and-continue",
    title: "do..while 里的 break 与 continue",
    src: `
let i = 0;
const out: number[] = [];
do {
  i++;
  if (i === 2) continue;
  if (i === 4) break;
  out.push(i);
} while (i < 10);
console.log(out.join(","), i);
`,
  },
  {
    id: "rt-nested-ternary-chain",
    title: "三元串成链：每个分支都带副作用",
    src: `
let mark = "";
const pick = (n: number): string => (n < 0 ? ((mark += "a"), "neg") : n === 0 ? ((mark += "b"), "zero") : ((mark += "c"), "pos"));
console.log(pick(-1), pick(0), pick(1), mark);
`,
  },
  {
    id: "rt-array-large-pipeline-push",
    title: "大量 push / shift：不 OOM、次序正确",
    src: `
const xs: number[] = [];
for (let i = 0; i < 2000; i++) xs.push(i);
let total = 0;
for (let i = 0; i < 1000; i++) total += xs.shift() as number;
console.log(xs.length, total, xs[0]);
`,
  },
  {
    id: "rt-string-in-operator",
    title: "in 在对象 / 数组 / 原型链上的口径",
    src: `
const o: any = { a: 1 };
console.log("a" in o, "b" in o, "toString" in o);
console.log(0 in [1, 2], 2 in [1, 2], "length" in []);
`,
  },
  {
    id: "rt-bigint-forms",
    title: "BigInt：字面量、运算、typeof、转换",
    src: `
console.log(1n + 2n, typeof 1n, BigInt(5), (10n).toString());
`,
    skip: "口径外：`BigInt` 在 docs/runtime-architecture.md §15 那张「明确不做」的表里（与 RegExp / Proxy / Intl 同档）",
  },
  {
    id: "rt-throw-in-finally-overrides",
    title: "finally 里再抛：盖掉原来的返回值",
    src: `
function f(): string {
  try {
    return "try";
  } finally {
    throw new Error("from-finally");
  }
}
try {
  console.log(f());
} catch (e) {
  console.log("caught", (e as Error).message);
}
`,
  },
  {
    id: "rt-instanceof-array-subclass",
    title: "extends Array：instanceof 两条链都对",
    src: `
class MyList extends Array {}
const m = new MyList();
m.push(1);
console.log(m instanceof MyList, m instanceof Array, m.length, Array.isArray(m));
`,
  },
  {
    id: "rt-computed-member-and-call-forms",
    title: "计算成员：读、写、调、delete 四条路",
    src: `
const key = "k";
const o: any = { [key]: () => 1 };
console.log(o[key](), o["k"]());
o[key] = () => 2;
console.log(o.k());
delete o[key];
console.log(o.k, "k" in o);
`,
  },
  // ===== 第 291 轮加宽：exec / runtime / 标准库 三层一起铺 =====
  {
    id: "c291-rt-number-to-string-forms",
    title: "数字取文本的几种量级",
    src: `
console.log(0.1 + 0.2, 1e21, 1e-7, 123456789.123456789);
console.log((0.000001).toString(), (0.0000001).toString(), (-1e21).toString());
`,
  },
  {
    id: "c291-rt-array-pipeline-forms",
    title: "数组管道的链式写法",
    src: `
const xs = [5, 3, 8, 1];
console.log(xs.filter((n) => n > 2).map((n) => n * 2).reduce((a, b) => a + b, 0));
console.log(xs.slice().sort((a, b) => a - b).join(","), xs.join(","));
`,
  },
  {
    id: "c291-rt-object-iteration-order",
    title: "整数键在前、插入序在后的枚举顺序",
    src: `
const o: any = {};
o.b = 1; o["2"] = 2; o.a = 3; o["1"] = 4;
console.log(Object.keys(o).join(","), JSON.stringify(o));
`,
  },
  {
    id: "c291-rt-error-propagation-forms",
    title: "错误的包装与 cause 的传播",
    src: `
function inner() { throw new RangeError("deep"); }
function outer() { try { inner(); } catch (e) { throw new Error("wrapped", { cause: e }); } }
try { outer(); } catch (e: any) { console.log(e.message, e.cause.message); }
`,
  },
  {
    id: "c291-rt-generator-forms",
    title: "生成器：双向传值与三段返回",
    src: `
function* gen() { const x = yield 1; yield x * 2; }
const g = gen();
console.log(JSON.stringify(g.next()), JSON.stringify(g.next(5)), JSON.stringify(g.next()));
`,
  },
  {
    id: "c291-rt-class-shapes",
    title: "类的字段 / 访问器 / 继承 / 静态成员的形状",
    src: `
class A { x = 1; static s = 2; get y() { return this.x + 1; } set y(v) { this.x = v; } }
class B extends A { constructor() { super(); this.z = 3; } }
const b = new B();
console.log(b.x, b.y, b.z, A.s, b instanceof A, Object.getPrototypeOf(B) === A);
`,
  },
  {
    id: "c291-rt-json-roundtrip-shapes",
    title: "JSON 往返：文本与解析回来的结构",
    src: `
const data = { list: [1, 2, 3], nested: { flag: true } };
const text = JSON.stringify(data);
console.log(text, JSON.parse(text).list.length);
`,
  },
  {
    id: "c291-rt-string-methods-chain",
    title: "字符串方法链",
    src: `
console.log("  Hello World  ".trim().toLowerCase().replace(" ", "-").split("-").join("|"));
`,
  },
  {
    id: "c291-rt-closure-and-method-this",
    title: "闭包里的 this 与方法调用",
    src: `
const obj = { v: 10, get() { return () => this.v; } };
console.log(obj.get()());
const o = { n: 1, inc() { this.n++; return this; } };
console.log(o.inc().inc().n, o.n);
`,
  },
  {
    id: "c291-rt-iteration-protocol-forms",
    title: "手写可迭代对象 + for..of",
    src: `
const arr = [1, 2, 3];
const it = arr[Symbol.iterator]();
let out = "";
for (const v of { [Symbol.iterator]: () => it } as any) out += v;
console.log(out);
`,
  },
  {
    id: "c291-rt-spread-and-rest-forms",
    title: "剩余参数与展开实参",
    src: `
function sum(...xs: number[]) { return xs.reduce((a, b) => a + b, 0); }
console.log(sum(...[1, 2, 3]), sum(1, ...[2, 3]), Math.max(...[1, 5, 3]));
const [a, ...rest] = [1, 2, 3];
console.log(a, rest.join(","));
`,
  },
  {
    id: "c291-rt-switch-and-fallthrough-forms",
    title: "switch 的穿透与 default",
    src: `
function t(x: number) { let s = ""; switch (x) { case 1: s += "a"; case 2: s += "b"; break; default: s += "d"; } return s; }
console.log(t(1), t(2), t(3));
`,
  },
  {
    id: "c291-rt-deep-recursion-forms",
    title: "朴素递归的深度",
    src: `
function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
console.log(fib(20));
`,
  },
  {
    id: "c291-rt-prototype-and-inheritance-forms",
    title: "三层继承与 super 方法链",
    src: `
class Base { m() { return "base"; } }
class Mid extends Base { m() { return super.m() + "-mid"; } }
class Leaf extends Mid { m() { return super.m() + "-leaf"; } }
console.log(new Leaf().m(), new Leaf() instanceof Base);
`,
  },
  {
    id: "c291-rt-optional-and-nullish-forms",
    title: "可选链与空值合并的几种位置",
    src: `
const o: any = { a: { b: null } };
console.log(o?.a?.b ?? "d", o?.z?.y ?? "d2", o.a?.["b"] ?? "d3");
console.log(o?.a?.b?.c, o.missing?.());
`,
  },
  {
    id: "c291-rt-numeric-edge-forms",
    title: "浮点与安全整数边界",
    src: `
console.log(0.1 + 0.2 === 0.3, Math.abs(0.1 + 0.2 - 0.3) < 1e-10);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(1 / 3, 2 ** 53, -(2 ** 53));
`,
  },
  {
    id: "c291-rt-string-unicode-forms",
    title: "代理对在长度、展开、码点上的三种读法",
    src: `
const s = "a😀b";
console.log(s.length, [...s].length, s.charCodeAt(1) > 255, s.codePointAt(1) > 65535);
`,
  },
  {
    id: "c291-rt-error-in-nested-callbacks",
    title: "回调里抛出的中断与捕获",
    src: `
try {
  [1, 2].forEach((v) => { if (v === 2) throw new Error("stop"); });
} catch (e: any) { console.log("caught", e.message); }
console.log("after");
`,
  },
  {
    id: "c291-rt-truthiness-table",
    title: "真假值表的常用几格",
    src: `
const vals: any[] = [0, -0, "", "0", null, undefined, NaN, [], {}, () => 1];
console.log(vals.map((v) => (v ? "T" : "F")).join(""));
console.log(!!NaN, !!0, !![], !!{});
`,
  },
  {
    id: "c291-rt-equality-table",
    title: "== 与 === 的对照表",
    src: `
console.log(null == undefined, null === undefined, 0 == "", 0 == false, "" == false);
console.log(NaN == NaN, NaN === NaN, [] == false, [1] == 1, "1" == 1);
`,
  },
  {
    id: "c291-rt-object-key-order-and-json",
    title: "键顺序在 Object.keys 与 JSON 上一致",
    src: `
const o: any = { z: 1, 10: 2, a: 3, 2: 4 };
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
`,
  },
  // ===== 第 298 轮补的一条：被拒绝的 async 之后的同步语句 =====
  // 它是**量 e2e 那两条时顺手撞见的** ✓（用户口径：「发现新问题就加对应语料」✓）——
  // 现场：`total("zzz").catch(…)` 之后那一句**同步** `console.log` **一条都不打** ✓，
  // 而 `node` 打「先同步那一句、再微任务那一句」✓——**静默少一半输出** ✗，
  // 退出码还是 0 ✗（所以只有逐字节对拍才看得见 ✓）。
  {
    id: "c298-async-reject-then-sync",
    title: "被拒绝的 async 之后的同步语句：先同步、后微任务",
    src: `
class Box {
  private data = new Map<string, number>();
  add(key: string, value: number): void { this.data.set(key, value); }
  async total(key: string): Promise<number> {
    const found = this.data.get(key);
    if (found === undefined) throw new Error("no key " + key);
    return found;
  }
}
const box = new Box();
box.add("a", 1);
box.total("zzz").catch((e: any) => console.log("caught", e.message));
console.log("sync after");
`,
  },

  // ===== 第 304 轮：加宽矩阵（48 条）=====

  {
    id: "c304-rt-new-target-in-ctor",
    title: "new.target：直接构造认得出、普通调用是 undefined",
    src: `
function F() { console.log("called", new.target === F); }
F();
new F();
class B { constructor() { console.log("name", new.target && new.target.name); } }
new B();
`,
  },
  {
    id: "c304-rt-setprototypeof-and-isprototypeof",
    title: "Object.setPrototypeOf / isPrototypeOf 的链",
    src: `
const base = { kind: "base" };
const child = Object.create(base);
console.log(child.kind, base.isPrototypeOf(child), Object.prototype.isPrototypeOf({}));
const other: any = { kind: "other" };
Object.setPrototypeOf(other, base);
console.log(other.kind, base.isPrototypeOf(other));
`,
  },
  {
    id: "c304-rt-preventextensions-and-isextensible",
    title: "Object.preventExtensions / isExtensible：标记打上了、可扩展性翻了面",
    src: `
const o: any = { a: 1 };
console.log(Object.isExtensible(o));
Object.preventExtensions(o);
console.log(Object.isExtensible(o), Object.isExtensible({}), Object.isExtensible(1), JSON.stringify(o));
`,
  },
  {
    id: "c304-rt-getter-setter-on-prototype-object",
    title: "对象字面量里的访问器（get / set 一对）",
    src: `
const o = {
  _n: 1,
  get n() { return this._n * 10; },
  set n(v: number) { this._n = v + 1; },
};
o.n = 4;
console.log(o.n, o._n);
`,
  },
  {
    id: "c304-rt-delete-nonconfigurable",
    title: "delete 一个不可配置的属性：松散模式静默返回 false",
    src: `
const o: any = {};
Object.defineProperty(o, "fixed", { value: 1, configurable: false });
console.log(delete o.fixed, o.fixed);
const p: any = { x: 1 };
console.log(delete p.x, "x" in p);
`,
  },
  {
    id: "c304-rt-numeric-separators",
    title: "数字分隔符 `1_000_000` 与各种进制一起用",
    src: `
console.log(1_000_000, 0xFF_FF, 0b1010_1010, 0o7_7);
console.log(1_0.5_0, 1e1_0);
`,
  },
  {
    id: "c304-rt-shift-and-mask",
    title: "移位与掩码：负数、超宽位移、无符号右移",
    src: `
console.log(-8 >> 2, -8 >>> 2, 1 << 31, 1 << 32, 1 << 33);
console.log(0xffffffff | 0, 0xffffffff >>> 0, ~5, 5 & 3, 5 | 3, 5 ^ 3);
`,
  },
  {
    id: "c304-rt-exponent-assign-forms",
    title: "`**` 与 `**=`：右结合、与一元负号的关系",
    src: `
let n = 2;
n **= 3;
console.log(n, 2 ** 3 ** 2, (-2) ** 2, 2 ** -1);
console.log((2 ** 0.5).toFixed(4));
`,
  },
  {
    id: "c304-rt-nested-try-finally-order",
    title: "嵌套 try/finally 的收尾次序（含内层抛、外层接住）",
    src: `
const log: string[] = [];
try {
  try {
    log.push("inner-throw");
    throw new Error("x");
  } finally {
    log.push("inner-finally");
  }
} catch (e) {
  log.push("outer-catch");
} finally {
  log.push("outer-finally");
}
console.log(log.join(">"));
`,
  },
  {
    id: "c304-rt-switch-true-pattern",
    title: "`switch (true)` 的分支写法",
    src: `
function grade(n: number): string {
  switch (true) {
    case n >= 90: return "A";
    case n >= 80: return "B";
    case n >= 70: return "C";
    default: return "F";
  }
}
console.log(grade(95), grade(85), grade(75), grade(10));
`,
  },
  {
    id: "c304-rt-do-while-label-continue",
    title: "带标号的 do/while 与 continue",
    src: `
let i = 0;
const seen: number[] = [];
outer: do {
  i += 1;
  if (i % 2 === 0) continue outer;
  seen.push(i);
} while (i < 6);
console.log(seen.join(","));
`,
  },
  {
    id: "c304-rt-ternary-with-assignments",
    title: "三元表达式里带赋值与逗号",
    src: `
let a = 1;
let b = 2;
const pick = a < b ? (a = 10, "less") : (b = 20, "more");
console.log(pick, a, b);
console.log(a > b ? "gt" : a === b ? "eq" : "lt");
`,
  },
  {
    id: "c304-rt-void-and-comma-forms",
    title: "void 与逗号运算符的返回值",
    src: `
let n = 0;
const r = (n += 1, n += 2, n);
console.log(r, n);
console.log(void 0, void "x", typeof void 0);
const f = () => void console.log("side");
console.log(f());
`,
  },
  {
    id: "c304-rt-iife-arrow-this",
    title: "箭头 IIFE 里的 this 与外部一致",
    src: `
const obj = {
  tag: "obj",
  run() {
    return (() => this.tag)();
  },
  run2() {
    return (function (this: any) { return this === undefined ? "undefined" : "bound"; })();
  },
};
console.log(obj.run(), obj.run2());
`,
  },
  {
    id: "c304-rt-closure-capture-in-forof",
    title: "for..of 里每个迭代一格闭包",
    src: `
const fns: Array<() => number> = [];
for (const n of [1, 2, 3]) fns.push(() => n);
console.log(fns.map((f) => f()).join(","));
const byIndex: Array<() => number> = [];
for (let i = 0; i < 3; i++) byIndex.push(() => i);
console.log(byIndex.map((f) => f()).join(","));
`,
  },
  {
    id: "c304-rt-class-arrow-field-this",
    title: "类字段里的箭头函数：this 永远是这个实例",
    src: `
class Counter {
  n = 0;
  bump = () => { this.n += 1; return this.n; };
}
const c = new Counter();
const detached = c.bump;
console.log(detached(), detached(), c.n);
`,
  },
  {
    id: "c304-rt-super-property-read",
    title: "super.x 读的是父类原型上的那一格",
    src: `
class A { get label() { return "A"; } m() { return "A.m"; } }
class B extends A {
  get label() { return "B+" + super.label; }
  m() { return "B+" + super.m(); }
}
const b = new B();
console.log(b.label, b.m());
`,
  },
  {
    id: "c304-rt-super-property-write",
    title: "super.x = v 落在父类原型那一格上",
    src: `
class A { set label(v: string) { console.log("A.set", v); } }
class B extends A { set label(v: string) { super.label = v.toUpperCase(); } }
const b = new B();
b.label = "hi";
`,
  },
  {
    id: "c304-rt-static-private-field",
    title: "静态私有字段与静态方法一起用",
    src: `
class Registry {
  static #items: string[] = [];
  static add(x: string) { Registry.#items.push(x); return Registry.#items.length; }
  static get all() { return Registry.#items.join(","); }
}
console.log(Registry.add("a"), Registry.add("b"), Registry.all);
`,
  },
  {
    id: "c304-rt-defineproperty-getter-on-instance",
    title: "defineProperty 在实例上装一个 getter",
    src: `
const o: any = { _v: 2 };
Object.defineProperty(o, "double", { get() { return this._v * 2; }, enumerable: true });
console.log(o.double, Object.keys(o).join(","));
o._v = 5;
console.log(o.double);
`,
  },
  {
    id: "c304-rt-symbol-as-map-key",
    title: "符号当 Map 的键：每次 for 都是新键",
    src: `
const a = Symbol("k");
const b = Symbol("k");
const m = new Map<any, number>();
m.set(a, 1);
m.set(b, 2);
m.set("a", 3);
console.log(m.size, m.get(a), m.get(b), m.get("a"));
`,
  },
  {
    id: "c304-rt-map-delete-during-iteration",
    title: "迭代 Map 时删掉当前项",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k, v] of m) {
  seen.push(k + "=" + v);
  if (k === "b") m.delete(k);
}
console.log(seen.join(","), m.size, [...m.keys()].join(","));
`,
  },
  {
    id: "c304-rt-set-object-identity-and-size",
    title: "Set 认对象身份，两个同形状的对象是两个元素",
    src: `
const s = new Set<any>();
const o1 = { a: 1 };
const o2 = { a: 1 };
s.add(o1);
s.add(o2);
s.add(o1);
console.log(s.size, s.has(o1), s.has({ a: 1 }), [...s].length);
`,
  },
  {
    id: "c304-rt-array-from-set-and-map",
    title: "Array.from 吃 Set 与 Map 的 entries",
    src: `
console.log(Array.from(new Set([3, 1, 3])).join(","));
const m = new Map([["a", 1], ["b", 2]]);
console.log(Array.from(m).map((p) => p[0] + p[1]).join(","));
console.log(Array.from("abc").join("-"));
`,
  },
  {
    id: "c304-rt-detached-method-this-undefined",
    title: "把方法摘下来单独调：松散模式 this 是全局对象",
    src: `
const o = { tag: "o", who(this: any) { return this === undefined ? "undefined" : this === globalThis ? "global" : "other"; } };
const f = o.who;
console.log(f(), o.who());
`,
  },
  {
    id: "c304-rt-call-apply-bind-forms",
    title: "call / apply / bind 三种调用形态",
    src: `
function sum(this: any, a: number, b: number) { return a + b + (this?.base ?? 0); }
const ctx = { base: 10 };
console.log(sum.call(ctx, 1, 2), sum.apply(ctx, [3, 4]));
const bound = sum.bind(ctx, 5);
console.log(bound(6), bound.length, bound.name);
`,
  },
  {
    id: "c304-rt-array-length-grow-and-shrink",
    title: "改 length：变长留洞、变短截断",
    src: `
const xs = [1, 2, 3];
xs.length = 5;
console.log(xs.length, xs[3], JSON.stringify(xs));
xs.length = 1;
console.log(xs.length, JSON.stringify(xs), xs[5]);
`,
  },
  {
    id: "c304-rt-nested-destructure-rename",
    title: "嵌套解构 + 改名 + 默认值一起",
    src: `
const src = { user: { name: "kim", tags: ["a", "b"] }, extra: null };
const { user: { name: who, tags: [first, second = "z"] }, extra = "none" } = src as any;
console.log(who, first, second, extra);
`,
  },
  {
    id: "c304-rt-destructure-in-forof-entries",
    title: "for..of 里直接解构 entries 与数组的数组",
    src: `
const pairs: Array<[string, number]> = [["a", 1], ["b", 2]];
for (const [k, v] of pairs) console.log(k, v * 2);
for (const [i, x] of ["p", "q"].entries()) console.log(i, x);
`,
  },
  {
    id: "c304-rt-rest-in-object-destructure",
    title: "对象解构里的剩余",
    src: `
const o = { a: 1, b: 2, c: 3 };
const { a, ...rest } = o;
console.log(a, JSON.stringify(rest), Object.keys(rest).join(","));
const { b: renamed, ...rest2 } = o;
console.log(renamed, JSON.stringify(rest2));
`,
  },
  {
    id: "c304-rt-optional-chain-call-forms",
    title: "可选调用的三种位置",
    src: `
const o: any = { m() { return "m"; }, n: null };
console.log(o.m?.(), o.n?.(), o.n?.[0], o.missing?.());
const f: any = null;
console.log(f?.());
`,
  },
  {
    id: "c304-rt-nullish-assign-forms",
    title: "??= / ||= / &&= 与副作用的次数",
    src: `
let calls = 0;
const bump = () => { calls += 1; return undefined; };
let a: any = null;
a ??= "filled";
let b: any = "keep";
b ||= "no";
let c: any = 1;
c &&= c + 1;
console.log(a, b, c, calls);
let d: any = undefined;
d ??= bump();
console.log(d, calls);
`,
  },
  {
    id: "c304-rt-comma-in-return-and-args",
    title: "逗号表达式出现在 return 与实参位",
    src: `
function f() { return (1, 2, 3); }
console.log(f());
function g(a: number, b: number) { return a + b; }
let t = 0;
console.log(g((t = 1, 10), (t = 2, 20)), t);
`,
  },
  {
    id: "c304-rt-generator-early-break-finally",
    title: "for..of 提前 break：生成器里的 finally 照跑",
    src: `
function* gen() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("cleanup");
  }
}
for (const v of gen()) {
  console.log("got", v);
  break;
}
`,
  },
  {
    id: "c304-rt-promise-then-returns-promise",
    title: "then 里返回一个承诺：会被展开",
    src: `
Promise.resolve(1)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => { console.log("value", v); return v * 10; })
  .then((v) => console.log("chained", v));
console.log("sync-first");
`,
  },
  {
    id: "c304-rt-async-loop-sequential",
    title: "async 函数里顺序 await 一个循环",
    src: `
const delay = (v: number) => Promise.resolve(v);
async function run() {
  let total = 0;
  for (const n of [1, 2, 3]) total += await delay(n);
  return total;
}
run().then((t) => console.log("total", t));
console.log("started");
`,
  },
  {
    id: "c304-rt-await-in-try-finally",
    title: "await 落在 try/finally 里：收尾次序",
    src: `
async function run() {
  try {
    console.log("try", await Promise.resolve("a"));
    return "from-try";
  } finally {
    console.log("finally", await Promise.resolve("b"));
  }
}
run().then((v) => console.log("result", v));
`,
  },
  {
    id: "c304-rt-throw-in-async-caught",
    title: "async 体里抛：承诺被拒绝、调用处接得住",
    src: `
async function boom() {
  throw new Error("async-boom");
}
boom().catch((e) => console.log("caught", e.message));
async function viaAwait() {
  try {
    await boom();
  } catch (e: any) {
    return "handled:" + e.message;
  }
}
viaAwait().then((v) => console.log(v));
`,
  },
  {
    id: "c304-rt-custom-error-instanceof",
    title: "自定义错误子类：instanceof 两条链都对",
    src: `
class AppError extends Error {
  code: number;
  constructor(msg: string, code = 500) { super(msg); this.name = "AppError"; this.code = code; }
}
const e = new AppError("bad");
console.log(e instanceof AppError, e instanceof Error, e.message, e.code, e.name);
try {
  throw new AppError("thrown", 404);
} catch (err: any) {
  console.log(err instanceof AppError, err.code);
}
`,
  },
  {
    id: "c304-rt-arrow-in-method-this",
    title: "方法里的箭头回调拿到的是实例的 this",
    src: `
class Box {
  items: number[] = [1, 2, 3];
  sum(): number {
    return this.items.reduce((acc, x) => acc + x, 0);
  }
  doubled(): number[] {
    return this.items.map((x) => x * this.items.length);
  }
}
const b = new Box();
console.log(b.sum(), b.doubled().join(","));
`,
  },
  {
    id: "c304-rt-proto-chain-walk",
    title: "顺着原型链往上找，直到没有",
    src: `
class A { a() { return "a"; } }
class B extends A { b() { return "b"; } }
const inst = new B() as any;
const names: string[] = [];
let p = inst;
while (p) {
  names.push(Object.getOwnPropertyNames(p).join("+"));
  p = Object.getPrototypeOf(p);
}
console.log(names.length > 2, names[0].includes("b") || names[1].includes("b"));
console.log(typeof inst.a, typeof inst.b, typeof inst.zzz);
`,
  },
  {
    id: "c304-rt-object-keys-order-after-delete",
    title: "删掉再插回来：键的次序跟着变",
    src: `
const o: any = { a: 1, b: 2, c: 3 };
delete o.b;
o.b = 9;
o[2] = "two";
o[1] = "one";
console.log(Object.keys(o).join(","), JSON.stringify(o));
`,
  },
  {
    id: "c304-rt-string-key-iteration-order",
    title: "for..in 与 Object.keys 在同一个对象上同序",
    src: `
const o: any = { z: 1, 10: "ten", a: 2, 2: "two" };
const viaForIn: string[] = [];
for (const k in o) viaForIn.push(k);
console.log(viaForIn.join(","));
console.log(Object.keys(o).join(","));
`,
  },
  {
    id: "c304-rt-recursion-memo",
    title: "递归加记忆化：Map 当缓存",
    src: `
const cache = new Map<number, number>();
function fib(n: number): number {
  if (n < 2) return n;
  const hit = cache.get(n);
  if (hit !== undefined) return hit;
  const v = fib(n - 1) + fib(n - 2);
  cache.set(n, v);
  return v;
}
console.log(fib(30), cache.size);
`,
  },
  {
    id: "c304-rt-large-array-reduce",
    title: "大数组上的 reduce / filter / map 串起来",
    src: `
const xs = Array.from({ length: 2000 }, (_, i) => i + 1);
const total = xs.filter((n) => n % 3 === 0).map((n) => n * 2).reduce((a, b) => a + b, 0);
console.log(total, xs.length);
`,
  },
  {
    id: "c304-rt-getter-throws-and-finally",
    title: "getter 里抛：try/finally 收尾，属性没变",
    src: `
const o: any = {
  _v: 1,
  get v() { if (this._v < 0) throw new RangeError("negative"); return this._v; },
};
try {
  o._v = -1;
  console.log(o.v);
} catch (e: any) {
  console.log(e.name, e.message);
} finally {
  o._v = 5;
}
console.log(o.v);
`,
  },
  {
    id: "c304-rt-string-number-coercion-table",
    title: "字符串与数字的隐式转换表",
    src: `
console.log("5" * 2, "5" + 2, "5" - 2, "" + null, "" + undefined, 1 / "2");
console.log([1, 2] + "", [] + "", [null] + "", true + 1, null + 1, undefined + 1);
console.log(Number("  12  "), Number(""), Number("0x10"), Number("1e3"));
`,
  },
  {
    id: "c304-rt-nested-closure-mutation",
    title: "三层闭包改同一个变量",
    src: `
function outer() {
  let n = 0;
  return function middle() {
    return function inner() {
      n += 1;
      return n;
    };
  };
}
const mid = outer();
const a = mid();
const b = mid();
console.log(a(), a(), b(), a());
`,
  },

  // ===== 第 305 轮：加宽矩阵（53 条）=====

  {
    id: "c305-rt-catch-destructured-param",
    title: "catch 的形参可以解构（`catch ({ message, code })`）",
    src: `
try {
  throw { message: "m", code: 7 };
} catch ({ message, code }: any) {
  console.log("caught", message, code);
}
`,
  },
  {
    id: "c305-rt-finally-break-in-loop",
    title: "循环里的 `try/finally`：`break` 之后 finally 照跑",
    src: `
for (let i = 0; i < 3; i++) {
  try {
    if (i === 1) break;
    console.log("body", i);
  } finally {
    console.log("fin", i);
  }
}
console.log("after");
`,
  },
  {
    id: "c305-rt-while-assignment-condition",
    title: "`while ((v = xs.shift()) !== undefined)`：条件里的赋值",
    src: `
const xs = [1, 2, 3];
let total = 0;
let v: number | undefined;
while ((v = xs.shift()) !== undefined) {
  total += v;
}
console.log(total, xs.length);
`,
  },
  {
    id: "c305-rt-do-while-block-scope",
    title: "`do..while` 体里的块级作用域变量",
    src: `
let i = 0;
const seen: number[] = [];
do {
  const doubled = i * 2;
  seen.push(doubled);
  i++;
} while (i < 3);
console.log(seen.join(","));
`,
  },
  {
    id: "c305-rt-switch-case-block-scope",
    title: "`switch` 每个 case 各自一对花括号（同名 const 不冲突）",
    src: `
function f(n: number): string {
  switch (n) {
    case 1: { const label = "one"; return label; }
    case 2: { const label = "two"; return label; }
    default: { const label = "other"; return label; }
  }
}
console.log(f(1), f(2), f(3));
`,
  },
  {
    id: "c305-rt-let-loop-inner-const-capture",
    title: "经典 `for` 的每一次迭代里再取一个 const 给闭包",
    src: `
const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) {
  const j = i * 10;
  fns.push(() => j);
}
console.log(fns.map((f) => f()).join(","));
`,
  },
  {
    id: "c305-rt-nested-shadowing-three-levels",
    title: "三层同名变量的遮蔽（全局 / 外层函数 / 内层函数）",
    src: `
const x = 1;
function outer(): number {
  const x = 2;
  function inner(): number {
    const x = 3;
    return x;
  }
  return inner() + x;
}
console.log(outer(), x);
`,
  },
  {
    id: "c305-rt-recursive-generator-delegation",
    title: "递归的 `yield*`：把嵌套数组压平",
    src: `
function* flat(xs: any[]): Generator<number> {
  for (const x of xs) {
    if (Array.isArray(x)) yield* flat(x);
    else yield x;
  }
}
console.log([...flat([1, [2, [3, 4]], 5])].join(","));
`,
  },
  {
    id: "c305-rt-generator-exhausted-next",
    title: "生成器走完之后 `next()` 恒为 `{ value: undefined, done: true }`",
    src: `
function* g() { yield 1; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
`,
  },
  {
    id: "c305-rt-object-rest-keeps-symbol",
    title: "对象剩余**保留**可枚举的符号键（`{ ...o }` 与 `...rest` 同一条口径）",
    src: `
const s = Symbol("k");
const o: any = { a: 1, [s]: 2, b: 3 };
const { a, ...rest } = o;
console.log(a, Object.keys(rest).join(","), (rest as any)[s], JSON.stringify({ ...o } as any));
`,
  },
  {
    id: "c305-rt-object-spread-triggers-getter",
    title: "`{ ...src }` 会把 getter 取值一次（不是搬运那格描述符）",
    src: `
const src = { get x() { console.log("getter"); return 1; } };
const copy = { ...src };
console.log(copy.x);
`,
  },
  {
    id: "c305-rt-defineproperty-nonenumerable",
    title: "`defineProperty` 的 `enumerable: false` 不进 `Object.keys`，但读得到",
    src: `
const o: any = { a: 1 };
Object.defineProperty(o, "hidden", { value: 2, enumerable: false });
console.log(o.hidden, Object.keys(o).join(","), JSON.stringify(o));
`,
  },
  {
    id: "c305-rt-prototype-method-added-later",
    title: "实例造好之后往原型上挂方法，实例照样调得到",
    src: `
class A { n = 1; }
const a = new A();
(A.prototype as any).double = function (this: any) { return this.n * 2; };
console.log(a.double());
`,
  },
  {
    id: "c305-rt-instanceof-after-setprototypeof",
    title: "`setPrototypeOf` 之后 `instanceof` 跟着变",
    src: `
class A {}
class B {}
const b = new B();
console.log(b instanceof A, b instanceof B);
Object.setPrototypeOf(b, A.prototype);
console.log(b instanceof A, b instanceof B);
`,
  },
  {
    id: "c305-rt-three-level-static-inheritance",
    title: "三级静态继承：`this.kind` 在静态 getter 里认的是**子类**",
    src: `
class A {
  static kind = "a";
  static get label(): string { return "A-" + this.kind; }
}
class B extends A { static kind = "b"; }
class C extends B {}
console.log(A.label, B.label, C.label, C.kind);
`,
  },
  {
    id: "c305-rt-private-static-and-instance-methods",
    title: "私有实例方法 + 私有静态字段一起用",
    src: `
class C {
  #secret = 1;
  static #count = 0;
  #inc(): number { return ++this.#secret; }
  static bump(): number { return ++C.#count; }
  run(): number { return this.#inc(); }
}
const c = new C();
console.log(c.run(), C.bump(), C.bump());
`,
  },
  {
    id: "c305-rt-optional-chain-deep-null",
    title: "深链上中间一格是 null（`?.` 一路给 undefined）",
    src: `
const o: any = { a: { b: null } };
console.log(o?.a?.b?.c, o.a?.b?.c, o?.missing?.c);
`,
  },
  {
    id: "c305-rt-nullish-assign-short-circuit",
    title: "`??=` 短路：左值不是 null/undefined 时右边**不求值**",
    src: `
let a: any = 0;
let b: any = null;
let calls = 0;
const f = () => { calls++; return 5; };
a ??= f();
b ??= f();
console.log(a, b, calls);
`,
  },
  {
    id: "c305-rt-compound-assign-on-member",
    title: "成员位与下标位上的复合赋值",
    src: `
const o = { n: 10, xs: [1, 2] };
o.n += 5;
o.n *= 2;
o.xs[0] += 9;
console.log(o.n, o.xs.join(","));
`,
  },
  {
    id: "c305-rt-exponent-right-assoc",
    title: "`**` 右结合，且一元负号有它自己的优先级",
    src: `
console.log(2 ** 3 ** 2, (2 ** 3) ** 2, 2 ** -1);
`,
  },
  {
    id: "c305-rt-unary-plus-table",
    title: "一元 `+` 的转换表（空数组 0、单元素数组取值、非数字串是 NaN）",
    src: `
const vals: any[] = ["5", true, null, undefined, [], [7], "", "x"];
console.log(vals.map((v) => +v).join(","));
`,
  },
  {
    id: "c305-rt-string-comparison-unicode",
    title: "字符串按码元比大小（文本形式的 10 小于 9）",
    src: `
console.log("a" < "b", "abc" < "abd", "Z" < "a", "10" < "9", 10 < 9);
`,
  },
  {
    id: "c305-rt-array-string-index",
    title: "数组下标写字符串与写数字是同一格",
    src: `
const a: any = [1, 2, 3];
a["1"] = 20;
console.log(a[1], a["1"], a.length);
`,
  },
  {
    id: "c305-rt-number-to-text-edges",
    title: "数字取文本的几个边界（1e21 / 1e-7 / 0.1+0.2 / toFixed）",
    src: `
console.log(String(1e21), String(1e-7), String(0.1 + 0.2), (1234.5678).toFixed(2));
`,
  },
  {
    id: "c305-rt-template-nested-and-escape",
    title: "嵌套模板串与转义",
    src: "\nconst n = 3;\nconsole.log(`outer ${`inner ${n}`} done`, \"tab\\t|nl\");\n",
  },
  {
    id: "c305-rt-json-stringify-circular",
    title: "循环引用的对象 `JSON.stringify` 该抛 TypeError",
    src: `
const o: any = { a: 1 };
o.self = o;
try {
  JSON.stringify(o);
  console.log("no throw");
} catch (e) {
  console.log("threw", (e as Error).name);
}
`,
  },
  {
    id: "c305-rt-array-holes-json",
    title: "稀疏数组：`JSON.stringify` 把洞写成 null，`1 in xs` 是假",
    src: `
const xs: any[] = [1, , 3];
console.log(JSON.stringify(xs), xs.length, 1 in xs);
`,
  },
  {
    id: "c305-rt-map-order-after-delete-add",
    title: "`Map` 删掉再插，迭代顺序是「先来的先出」",
    src: `
const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
m.delete("a");
m.set("d", 4);
console.log([...m.keys()].join(","), m.size);
`,
  },
  {
    id: "c305-rt-set-insertion-order",
    title: "`Set` 按插入序迭代，重复项不占新位置",
    src: `
const s = new Set([3, 1, 3, 2]);
s.add(1);
console.log([...s].join(","), s.size);
`,
  },
  {
    id: "c305-rt-weakmap-not-enumerable",
    title: "`WeakMap` 的条目不进 `JSON.stringify` / `Object.keys`",
    src: `
const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), JSON.stringify(wm), Object.keys(wm).length);
`,
  },
  {
    id: "c305-rt-rest-param-and-spread-order",
    title: "剩余形参与展开实参一起用（顺序不乱）",
    src: `
function f(a: number, ...rest: number[]): string { return a + ":" + rest.join("|"); }
const xs = [2, 3];
console.log(f(1, ...xs, 4), f(...([1, 2, 3] as number[])));
`,
  },
  {
    id: "c305-rt-async-return-adopts-promise",
    title: "`async` 函数 `return` 一个承诺：结果承诺采纳它",
    src: `
async function f() { return Promise.resolve(7); }
f().then((v) => console.log("v", v));
console.log("sync");
`,
  },
  {
    id: "c305-rt-async-generator-basic",
    title: "`async function*` 与 `for await..of`",
    src: `
async function* g(): AsyncGenerator<number> { yield 1; yield 2; }
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log("agen", out.join(","));
}
main();
`,
  },
  {
    id: "c305-rt-async-generator-await-inside",
    title: "异步生成器体里 `await` 之后的 `yield`",
    src: `
async function* g() {
  for (const n of [1, 2]) {
    const v = await Promise.resolve(n * 10);
    yield v;
  }
}
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log(out.join(","));
}
main();
`,
  },
  {
    id: "c305-rt-for-await-of-promises",
    title: "`for await..of` 一个「承诺数组」：每一项都先兑现",
    src: `
async function main() {
  const out: number[] = [];
  for await (const v of [Promise.resolve(1), 2, Promise.resolve(3)]) out.push(v);
  console.log(out.join(","));
}
main();
`,
  },
  {
    id: "c305-rt-microtask-order-mixed",
    title: "微任务次序：`then` 与 `await` 混在一起",
    src: `
console.log("a");
Promise.resolve().then(() => console.log("b"));
async function f() {
  console.log("c");
  await null;
  console.log("d");
}
f();
Promise.resolve().then(() => console.log("e"));
console.log("f");
`,
  },
  {
    id: "c305-rt-promise-all-async-fns",
    title: "`Promise.all` 里是几个 async 函数",
    src: `
async function f(n: number) { return n * 2; }
Promise.all([f(1), f(2), 3]).then((xs) => console.log(xs.join(",")));
console.log("start");
`,
  },
  {
    id: "c305-rt-promise-finally-passthrough",
    title: "`finally` 把值原样传下去",
    src: `
Promise.resolve(5).finally(() => console.log("fin")).then((v) => console.log("v", v));
`,
  },
  {
    id: "c305-rt-await-inside-catch",
    title: "`catch` 体里 `await`",
    src: `
async function f() {
  try {
    throw new Error("x");
  } catch (e) {
    const m = await Promise.resolve((e as Error).message);
    console.log("caught", m);
  }
}
f();
`,
  },
  {
    id: "c305-rt-class-expression-named-self-reference",
    title: "具名类表达式：名字只在类体里可见",
    src: `
const C = class Named {
  static id = "N";
  get tag(): string { return Named.id; }
};
console.log(new C().tag, C.id, typeof (C as any).Named);
`,
  },
  {
    id: "c305-rt-getter-throws-in-destructuring",
    title: "解构触发的 getter 抛错能被 catch 接住",
    src: `
const o: any = { get a() { throw new Error("boom"); } };
try {
  const { a } = o;
  console.log("no throw", a);
} catch (e) {
  console.log("caught", (e as Error).message);
}
`,
  },
  {
    id: "c305-rt-object-keys-after-delete-readd",
    title: "`delete` 之后再写回同一个键：它排到**最后**",
    src: `
const o: any = { a: 1, b: 2, c: 3 };
delete o.b;
o.b = 4;
console.log(Object.keys(o).join(","));
`,
  },
  {
    id: "c305-rt-throw-in-nested-finally",
    title: "内层 `finally` 跑完之后，外层的 `catch` 接得住那一抛",
    src: `
function f(): string {
  try {
    try {
      throw new Error("inner");
    } finally {
      console.log("fin");
    }
  } catch (e) {
    return (e as Error).message;
  }
}
console.log(f());
`,
  },
  {
    id: "c305-rt-arrow-in-method-captures-this",
    title: "方法里的箭头回调捕获 `this`",
    src: `
const obj = {
  v: 10,
  run(): number[] { return [1, 2].map((n) => n + this.v); },
};
console.log(obj.run().join(","));
`,
  },
  {
    id: "c305-rt-array-sort-default-lexicographic",
    title: "默认排序按文本（大写在小写前）",
    src: `
console.log(["b", "a", "C", "A"].sort().join(","), [10, 9, 1].sort().join(","));
`,
  },
  {
    id: "c305-rt-array-concat-non-array",
    title: "`concat` 把非数组项原样接上、把数组项摊开",
    src: `
const xs: any = [1, 2];
console.log(xs.concat(3, [4, 5], "6").join(","));
`,
  },
  {
    id: "c305-rt-in-operator-prototype-chain",
    title: "`in` 走原型链，`Object.keys` 不走",
    src: `
class A { m() {} }
const a = new A();
console.log("m" in a, "toString" in a, "nope" in a, Object.keys(a).length);
`,
  },
  {
    id: "c305-rt-delete-inherited-property",
    title: "`delete` 一个继承来的属性：返回真，但原型上那一格还在",
    src: `
class A { m() { return 1; } }
const a = new A();
console.log(delete (a as any).m, "m" in a, a.m());
`,
  },
  {
    id: "c305-rt-recursive-json-clone",
    title: "手写递归深拷贝（数组 / 对象 / 原始值三档）",
    src: `
function clone(v: any): any {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }
  return v;
}
const src = { a: [1, { b: 2 }], c: "x" };
const copy = clone(src);
copy.a[1].b = 99;
console.log(JSON.stringify(src), JSON.stringify(copy));
`,
  },
  {
    id: "c305-rt-reduce-build-record",
    title: "`reduce` 拿一个对象当累加器（词频那一类）",
    src: `
const xs = ["a", "b", "a"];
const counts = xs.reduce<Record<string, number>>((acc, x) => {
  acc[x] = (acc[x] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify(counts));
`,
  },
  {
    id: "c305-rt-var-hoisting-in-function",
    title: "函数体里的 `var` 提升（声明前读到 undefined）",
    src: `
function f(): number {
  console.log(typeof v);
  var v = 1;
  return v;
}
console.log(f());
`,
  },
  {
    id: "c305-rt-string-key-iteration-in-for-in",
    title: "`for..in` 一个字符串：键是下标文本",
    src: `
let keys = "";
for (const k in "abc") keys += k;
console.log(keys);
`,
  },
  {
    id: "c305-rt-nested-array-destructure-assign",
    title: "嵌套解构赋值（左边是成员位）",
    src: `
const o: any = {};
const src = { a: 1, b: { c: 2 } };
({ a: o.x, b: { c: o.y } } = src);
console.log(o.x, o.y);
`,
  },

  // ===== 第 307 轮：量「`typeof` 的操作数位」时新收的两条 =====

  {
    id: "c307-rt-typeof-element-call-bare",
    title: "`typeof` 后面直接跟「下标调用」（没有外层括号）",
    src: "\nconst o: any = { m: () => ({ a: 1 }) };\nconsole.log(typeof o[\"m\"](), typeof o.m());\n",
  },
  {
    id: "c307-rt-typeof-element-call-in-args",
    title: "`typeof` 的操作数是「下标调用」，而且它不是实参表的第一格",
    src: "\nconst o: any = { m: () => ({ a: 1 }) };\nconsole.log(\"x\", typeof (o[\"m\"]()));\n",
  },

  // ===== 第 312 轮：生成器的 `next(v)` 那一半 =====

  {
    id: "c312-rt-generator-next-two-way",
    title: "生成器的双向通信：`next(v)` 的值落在上一个 `yield` 那一格",
    src: "\nfunction* talk(): Generator<string, string, number> {\n  const first = yield \"ask\";\n  const second = yield \"echo:\" + first;\n  return \"done:\" + second;\n}\nconst it: any = talk();\nconsole.log(it.next(1).value);\nconsole.log(it.next(10).value);\nconsole.log(JSON.stringify(it.next(20)));\nconst plain: any = (function* () { const got = yield 1; yield got * 2; })();\nplain.next();\nconsole.log(plain.next(21).value);\n",
  },

  // ===== 第 313 轮：往生成器里 throw（两种结局） =====

  {
    id: "c313-rt-generator-throw-into",
    title: "往生成器里 `throw`：体内接得住，没接住的那一抛连 `done` 一起收尾",
    src: "\nfunction* g(): Generator<string, void, void> {\n  try { yield \"a\"; } catch (e: any) { yield \"caught:\" + e.message; }\n  yield \"end\";\n}\nconst it: any = g();\nconsole.log(it.next().value);\nconsole.log(it.throw(new Error(\"in\")).value);\nconsole.log(it.next().value, it.next().done);\nfunction* uncaught(): Generator<number, void, void> { yield 1; }\nconst u: any = uncaught();\nconsole.log(u.next().value);\ntry { u.throw(new Error(\"boom\")); console.log(\"no throw\"); } catch (e: any) { console.log(\"caught outside\", e.message); }\nconsole.log(JSON.stringify(u.next()));\n",
  },

  // ===== 第 314 轮：循环之后的环境链（当天只量到，没修） =====

  {
    id: "c314-rt-top-level-env-after-let-loop",
    title: "顶层 `for (let …)` 造过闭包之后，循环后面的代码读环境格会读错链",
    src: "\nconst fns: Array<() => number> = [];\nfor (let i = 0; i < 3; i++) fns.push(() => i);\nconsole.log(\"A\", fns.map((f) => f()).join(\",\"));\nfunction mk(): () => number { let n = 5; return () => n; }\nconsole.log(\"H\", mk()());\n",
  },

  // ===== 第 315 轮：`EnvLeave` 那条纪律（续跳点也在内） =====

  {
    id: "c315-rt-env-leave-on-continue",
    title: "`continue` 那一跳也要重建环境：两种循环的每轮一格都经得起 `continue`",
    src: "\nconst fns: (() => number)[] = [];\nfor (let i = 0; i < 4; i++) { if (i === 1) continue; fns.push(() => i); }\nconsole.log(fns.map((f) => f()).join(\",\"));\nconst gns: (() => string)[] = [];\nfor (const ch of [\"a\", \"b\", \"c\"]) { if (ch === \"b\") continue; gns.push(() => ch); }\nconsole.log(gns.map((f) => f()).join(\",\"));\n",
  },

  // ===== 第 316 轮：块那一层环境 =====

  {
    id: "c316-rt-block-scope-env",
    title: "块也开一层环境：两次进入同一个块、块里的两个同名 `const` 各是各的",
    src: "\nfunction make(): (() => number)[] {\n  const out: (() => number)[] = [];\n  { const a = 1; out.push(() => a); }\n  { const a = 2; out.push(() => a); }\n  return out;\n}\nconst pair = make();\nconsole.log(pair[0](), pair[1]());\nfunction twice(): number {\n  let total = 0;\n  for (let k = 0; k < 2; k++) {\n    const local = k + 1;\n    total += (() => local)();\n  }\n  return total;\n}\nconsole.log(twice());\n",
  },

  // ===== 第 317 轮：承诺的「采纳」那一支 =====

  {
    id: "c317-rt-promise-adoption-chain",
    title: "兑现值本身是承诺时的「采纳」：内层已结清 / 内层还挂着 / 内层被拒绝",
    src: "\nPromise.resolve(1)\n  .then((v) => Promise.resolve(v + 1))\n  .then((v) => { console.log(\"chain\", v); return v; })\n  .then(async () => 5)\n  .then((v) => console.log(\"pending-inner\", v))\n  .then(() => Promise.reject(new Error(\"x\")))\n  .catch((e: any) => console.log(\"reject-prop\", e.message));\n",
  },

  // ===== 第 319 轮：异步生成器那两种挂起 =====

  {
    id: "c319-rt-async-generator-two-suspends",
    title: "异步生成器：`await` 摘的挂起与 `yield` 摘的挂起不是一回事",
    src: "\nasync function* g(): AsyncGenerator<number> { yield 1; yield await Promise.resolve(2); yield 3; }\nasync function main(): Promise<void> {\n  const it: any = g();\n  console.log(\"next1\", JSON.stringify(await it.next()));\n  console.log(\"next2\", JSON.stringify(await it.next()));\n  console.log(\"next3\", JSON.stringify(await it.next()));\n  console.log(\"done\", JSON.stringify(await it.next()));\n  const plain = (async function* (): AsyncGenerator<number> { yield 7; })();\n  console.log(\"plain\", JSON.stringify(await plain.next()));\n}\nmain();\n",
  },
];
