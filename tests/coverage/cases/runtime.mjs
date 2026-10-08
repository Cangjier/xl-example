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
    // **第 358 轮：两万次改成一万次** ✗（**实测量的** ✓）：
    // 这一格量的是**回收器在压力下的行为** ✓，两万次与一万次的区别只是**跑多久** ✓；
    // 而两万次在引擎里要**一千多万条指令** ✗ ⇒ 撞上 `Limits.StepBudget` ✓
    //（那个上限是给「跑飞」用的 ✗，不该拦一个两秒就跑完的正常程序 ✓）。
    // 实测（同一台机器）：**两千次 582ms ✓、一万次 1070ms ✓、两万次 2095ms 但撞上限** ✗——
    // 所以取**一万** ✓：既在一千万条预算之内 ✓，又照样是一万次「造了又丢」✓。
    src: `
let total = 0;
for (let i = 0; i < 10000; i++) {
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

  // ============ 第 323 轮加宽：27 条 ============
  {
    id: "c323-rt-super-in-object-literal",
    title: "对象字面量里的方法用 `super` 取原型上的同名方法",
    src: `
const proto = { greet() { return "hi"; } };
const o = { __proto__: proto, greet() { return super.greet() + "!"; } };
console.log(o.greet());
`,
  },
  {
    id: "c323-rt-iterator-protocol-custom",
    title: "自定义可迭代对象：`[Symbol.iterator]` + `next()` 对象",
    src: `
class Range {
  n: number;
  constructor(n: number) { this.n = n; }
  [Symbol.iterator]() {
    let i = 0;
    const n = this.n;
    return { next: () => (i < n ? { value: i++, done: false } : { value: undefined, done: true }) };
  }
}
console.log([...new Range(4)].join(","));
console.log(Array.from(new Range(3)).join("-"));
`,
  },
  {
    id: "c323-rt-getter-on-prototype-chain",
    title: "原型链上的访问器：实例读、子类覆盖",
    src: `
class A { get label() { return "A"; } }
class B extends A { get label() { return super.label + "B"; } }
const b = new B();
console.log(b.label, Object.getPrototypeOf(B.prototype) === A.prototype);
`,
  },
  {
    id: "c323-rt-throw-primitive-catch",
    title: "抛原始值：字符串与数字都要被 catch 接住",
    src: `
function f(kind: string) {
  if (kind === "s") throw "boom";
  if (kind === "n") throw 42;
  return "ok";
}
for (const k of ["s", "n", "x"]) {
  try { console.log(k, f(k)); } catch (e) { console.log(k, "caught", e); }
}
`,
  },
  {
    id: "c323-rt-finally-overrides-return",
    title: "finally 里 return 覆盖 try 里的 return；finally 里 throw 覆盖一切",
    src: `
function a() { try { return 1; } finally { return 2; } }
function b() { try { return 1; } finally { console.log("cleanup"); } }
function c() { try { return 1; } finally { throw new Error("late"); } }
console.log(a(), b());
try { c(); } catch (e) { console.log((e as Error).message); }
`,
  },
  {
    id: "c323-rt-object-spread-order-and-override",
    title: "对象展开的顺序：后面的覆盖前面的，自己写的在最后",
    src: `
const base = { a: 1, b: 2 };
const o = { ...base, b: 3, ...{ c: 4 }, a: 9 };
console.log(Object.keys(o).join(","), o.a, o.b, o.c);
console.log(JSON.stringify({ ...base, ...{ a: 5 } }));
`,
  },
  {
    id: "c323-rt-map-keys-are-identity",
    title: "Map 的键按同值零比较：NaN 与对象各是一个键",
    src: `
const m = new Map();
const key = {};
m.set(NaN, "nan");
m.set(key, "obj");
m.set("1", "str");
m.set(1, "num");
console.log(m.size, m.get(NaN), m.get(key), m.get("1"), m.get(1));
`,
  },
  {
    id: "c323-rt-array-length-truncate-and-fill",
    title: "改 length 截断与留洞；洞的遍历行为",
    src: `
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length, xs[3]);
xs.length = 4;
console.log(xs.join(","), Object.keys(xs).join(","), xs.includes(undefined));
`,
  },
  {
    id: "c323-rt-closure-counter-and-shared-state",
    title: "闭包计数器：两个实例各有一份状态",
    src: `
function counter() { let n = 0; return { inc: () => ++n, get: () => n }; }
const a = counter(); const b = counter();
a.inc(); a.inc(); b.inc();
console.log(a.get(), b.get());
`,
  },
  {
    id: "c323-rt-instanceof-across-hierarchy",
    title: "instanceof 沿整条继承链；Object 那一格恒真",
    src: `
class A {} class B extends A {} class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(new A() instanceof B, Object.create(null) instanceof Object);
`,
  },
  {
    id: "c323-rt-undefined-null-comparisons",
    title: "null / undefined 的相等与排序口径",
    src: `
console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log(null < 1, undefined < 1, null >= 0, [null].includes(null));
console.log(typeof null, typeof undefined, String(null), String(undefined));
`,
  },
  {
    id: "c323-rt-numeric-keys-ordering",
    title: "属性枚举顺序：整数键在前升序，其余按插入序",
    src: `
const o: any = {};
o.z = 1; o["2"] = 2; o.a = 3; o["10"] = 4; o["1"] = 5;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
`,
  },
  {
    id: "c323-rt-array-from-iterable-and-mapfn",
    title: "Array.from 三种来源：数组式对象、可迭代对象、映射函数",
    src: `
console.log(Array.from({ length: 2, 0: "a" }).join(","));
console.log(Array.from(new Set([1, 2, 2])).join(","));
console.log(Array.from([1, 2, 3], (v, i) => v * 10 + i).join(","));
console.log(Array.from("abc").join(","), Array.from(new Map([["k", "v"]])).length);
`,
  },
  {
    id: "c323-rt-string-methods-on-primitives",
    title: "原始值上的字符串方法：链式调用与只读性",
    src: `
const s = "  Hello World  ";
console.log(s.trim().toLowerCase().split(" ").join("_"));
console.log("abc".toUpperCase(), "abc".charAt(1), "abc".slice(-2), "abc".indexOf("c"));
console.log(s.length, s[0] === " ", "ab".repeat(2));
`,
  },
  {
    id: "c323-rt-generator-delegation-and-return",
    title: "yield* 委托：内层返回值与外层继续产出",
    src: `
function* inner() { yield 1; yield 2; return "inner-done"; }
function* outer() { const r = yield* inner(); yield r; }
const it = outer();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
`,
  },
  {
    id: "c323-rt-destructuring-defaults-and-rest",
    title: "解构的默认值只在严格 undefined 时生效；剩余收尾",
    src: `
const [a = 1, b = 2, c = 3] = [undefined, null, 0];
const { x = 1, y = 2, ...rest } = { x: undefined, y: 5, z: 6, w: 7 };
console.log(a, b, c, x, y, Object.keys(rest).join(","));
`,
  },
  {
    id: "c323-rt-array-methods-chain",
    title: "数组方法链：map/filter/reduce/sort 一起用",
    src: `
const rows = [
  { name: "b", n: 2 },
  { name: "a", n: 3 },
  { name: "c", n: 1 },
];
const out = rows
  .filter((r) => r.n > 1)
  .sort((p, q) => q.n - p.n)
  .map((r) => r.name + ":" + r.n)
  .join("|");
console.log(out);
console.log(rows.reduce((sum, r) => sum + r.n, 0));
`,
  },
  {
    id: "c323-rt-class-static-and-instance-fields-order",
    title: "静态字段与实例字段的求值顺序",
    src: `
const log: string[] = [];
class C {
  static a = (log.push("static-a"), 1);
  b = (log.push("inst-b"), 2);
  static c = (log.push("static-c"), 3);
  constructor() { log.push("ctor"); }
}
new C();
console.log(log.join(","));
console.log(C.a, C.c, new C().b);
`,
  },
  {
    id: "c323-rt-empty-and-sparse-behaviour",
    title: "空数组与稀疏数组：map/forEach/reduce 的差别",
    src: `
const sparse: any[] = [1, , 3];
console.log(sparse.length, sparse.map((v) => v * 2).join(","), sparse.filter((v) => v === undefined).length);
let calls = 0;
sparse.forEach(() => { calls += 1; });
console.log(calls, [].reduce((a, b) => a + b, 0));
console.log(sparse.join("-"), JSON.stringify(sparse));
`,
  },
  {
    id: "c323-rt-json-nested-and-specials",
    title: "JSON 的嵌套、特殊值丢掉、以及循环引用",
    src: `
const o: any = { a: [1, { b: 2 }], c: null, d: undefined, e: () => 1, f: "x" };
console.log(JSON.stringify(o));
console.log(JSON.stringify([undefined, null, NaN, Infinity]));
console.log(JSON.stringify({ n: 1 }, null, 2).split("\\n").length);
const cyc: any = {}; cyc.self = cyc;
try { JSON.stringify(cyc); } catch (e) { console.log((e as Error).name); }
`,
  },
  {
    id: "c323-rt-error-subclass-and-message",
    title: "自定义错误类：name/message/instanceof 三格",
    src: `
class AppError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
}
const e = new AppError("bad", 7);
console.log(e.message, e.name, e.code, e instanceof AppError, e instanceof Error);
console.log(String(e));
`,
  },
  {
    id: "c323-rt-string-iteration-codepoints",
    title: "字符串迭代按码点：代理对合成一个",
    src: `
const s = "a\\u{1F600}b";
console.log([...s].length, s.length);
console.log(Array.from(s).map((c) => c.length).join(","));
for (const ch of s) console.log(ch.length);
`,
  },
  {
    id: "c323-rt-iife-and-arrow-this",
    title: "箭头抓外层的 this；方法里的 this 指向接收者",
    src: `
const obj = {
  v: 1,
  arrow() { return (() => this.v)(); },
  method() { return this.v + 1; },
};
console.log(obj.arrow(), obj.method(), obj.v);
const f = () => typeof this;
console.log(typeof f);
`,
  },
  {
    id: "c323-rt-array-subclass-and-methods",
    title: "继承 Array 的类：实例方法与 length",
    src: `
class List extends Array {
  first() { return this[0]; }
}
const xs = new List();
xs.push(1, 2, 3);
console.log(xs.length, xs.first(), xs.join(","), xs instanceof Array);
`,
  },
  {
    id: "c323-rt-object-keys-values-entries-roundtrip",
    title: "keys / values / entries 与 fromEntries 的往返",
    src: `
const o = { a: 1, b: 2 };
console.log(Object.keys(o).join(","), Object.values(o).join(","));
console.log(Object.entries(o).map(([k, v]) => k + "=" + v).join("&"));
console.log(JSON.stringify(Object.fromEntries(Object.entries(o))));
`,
  },
  {
    id: "c323-rt-optional-chain-all-slots",
    title: "可选链的每一种位置：属性、下标、调用、以及整条链短路",
    src: `
const o: any = { a: { b: () => ({ c: 5 }) } };
console.log(o?.a?.b?.().c, o?.x?.y, o?.a?.["b"]?.().c);
const n: any = null;
console.log(n?.a, n?.[0], n?.f?.());
`,
  },
  {
    id: "c323-rt-generator-early-return-cleanup",
    title: "提前结束生成器：return() 要跑 finally",
    src: `
function* g() { try { yield 1; yield 2; } finally { console.log("cleanup"); } }
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.return(9)));
console.log(JSON.stringify(it.next()));
`,
  },
  // ===== 第 330 轮收编（22 条）=====
  {
    id: "c330-rt-array-like-from",
    title: "类数组对象：`length` + 下标 + `Array.from`",
    src: `
const like = { 0: "a", 1: "b", length: 2 };
console.log(like[0], like.length, Array.from(like as any).join(","));
`,
  },
  {
    id: "c330-rt-array-like-slice-call",
    title: "`[].slice.call(类数组)`：数组方法是通用的",
    src: `
const like = { 0: "a", 1: "b", length: 2 };
console.log([].slice.call(like as any).join("-"));
`,
  },
  {
    id: "c330-rt-forof-string-codepoints",
    title: "`for..of` 一个字符串：按码点、含代理对",
    src: `
let count = 0;
const seen: string[] = [];
for (const ch of "a\\uD83D\\uDE00b") {
  count = count + 1;
  seen.push(ch.length + ":" + ch);
}
console.log(count, seen.join(" "));
console.log("a\\uD83D\\uDE00b".length, [..."\\uD83D\\uDE00"].length);
`,
  },
  {
    id: "c330-rt-object-key-order-mixed",
    title: "对象键序：整数键升序在前、其余按写入序",
    src: `
const o: { [k: string]: number } = {};
o["b"] = 1;
o["2"] = 2;
o["a"] = 3;
o["1"] = 4;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
`,
  },
  {
    id: "c330-rt-generator-send-and-return",
    title: "生成器：`next(v)` 送值 + 返回值随 `done`",
    src: `
function* counter(): Generator<number, string, number> {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const sent: number = yield total;
    total = total + (sent ?? 1);
  }
  return "sum=" + total;
}
const it = counter();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(20)));
console.log(JSON.stringify(it.next(30)));
`,
  },
  {
    id: "c330-rt-async-await-try-finally",
    title: "`await` 与 `try` / `finally` 的次序",
    src: `
async function run(): Promise<void> {
  const log: string[] = [];
  try {
    log.push("try");
    await null;
    throw new Error("x");
  } catch (e) {
    log.push("catch");
  } finally {
    log.push("finally");
  }
  log.push("after");
  console.log(log.join(","));
}
run();
`,
  },
  {
    id: "c330-rt-nested-map-of-arrays",
    title: "`Map` 装数组：就地追加与嵌套遍历",
    src: `
const groups = new Map<string, number[]>();
for (const n of [1, 2, 3, 4, 5]) {
  const key = n % 2 === 0 ? "even" : "odd";
  const bucket = groups.get(key);
  if (bucket === undefined) groups.set(key, [n]);
  else bucket.push(n);
}
for (const [key, list] of groups) console.log(key, list.join("+"));
console.log(groups.size, groups.get("even")!.length);
`,
  },
  {
    id: "c330-rt-class-field-arrow-this",
    title: "类字段箭头函数：`this` 钉在实例上",
    src: `
class Counter {
  count = 0;
  bump = (): number => {
    this.count = this.count + 1;
    return this.count;
  };
  twice(): number {
    return this.bump() + this.bump();
  }
}
const c = new Counter();
const detached = c.bump;
console.log(detached(), c.twice(), c.count);
`,
  },
  {
    id: "c330-rt-destructure-swap-deep",
    title: "解构交换与嵌套默认值",
    src: `
let a = 1;
let b = 2;
[a, b] = [b, a];
console.log(a, b);
const { x: { y = 5 } = {}, z = 9 } = { z: 1 } as any;
console.log(y, z);
const [, second = "s", ...rest] = ["f", undefined, "t1", "t2"];
console.log(second, rest.join(","));
`,
  },
  {
    id: "c330-rt-function-method-forms",
    title: "函数的三种写法与 `this` 的取法",
    src: `
const obj = {
  value: 7,
  plain(): number {
    return this.value;
  },
  arrow: () => 0,
  shorthand() {
    return this.value * 2;
  },
};
console.log(obj.plain(), obj.shorthand(), typeof obj.arrow);
const f = obj.plain;
console.log(f.call(obj), f.call({ value: 3 }));
`,
  },
  {
    id: "c330-rt-error-cause-chain",
    title: "错误链：`cause` 与嵌套包裹",
    src: `
function inner(): never {
  throw new Error("root");
}
function outer(): never {
  try {
    inner();
  } catch (e) {
    throw new Error("wrap", { cause: e });
  }
}
try {
  outer();
} catch (e) {
  const err = e as Error & { cause?: Error };
  console.log(err.message, err.cause?.message);
}
`,
  },
  {
    id: "c330-rt-try-finally-in-generator",
    title: "生成器里的 `try` / `finally` 与提前结束",
    src: `
function* g(): Generator<number> {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("cleanup in generator");
  }
}
const it = g();
console.log(it.next().value);
for (const v of it) console.log("loop", v);
`,
  },
  {
    id: "c330-rt-recursive-object-walk",
    title: "递归遍历任意嵌套结构并汇总",
    src: `
function sum(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    let total = 0;
    for (const item of value) total = total + sum(item);
    return total;
  }
  if (value !== null && typeof value === "object") {
    let total = 0;
    for (const key of Object.keys(value)) total = total + sum((value as any)[key]);
    return total;
  }
  return 0;
}
console.log(sum({ a: 1, b: [2, { c: 3 }], d: null }));
console.log(sum([[1, 2], [3, [4]]]));
`,
  },
  {
    id: "c330-rt-symbol-iterator-manual",
    title: "自定义迭代器：显式取出 `Symbol.iterator` 再推进",
    src: `
const iterable = {
  [Symbol.iterator](): { next(): { value: number; done: boolean } } {
    let at = 0;
    return {
      next(): { value: number; done: boolean } {
        at = at + 1;
        if (at > 3) return { value: 0, done: true };
        return { value: at * 10, done: false };
      },
    };
  },
};
const it = (iterable as any)[Symbol.iterator]();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
const spread: number[] = [...(iterable as any)];
console.log(spread.join(","));
`,
  },
  {
    id: "c330-ex-as-inside-spread",
    title: "`as` 落在展开位里：`[...(o as any)]`",
    src: `
const iterable = {
  [Symbol.iterator](): { next(): { value: number; done: boolean } } {
    let at = 0;
    return {
      next(): { value: number; done: boolean } {
        at = at + 1;
        if (at > 3) return { value: 0, done: true };
        return { value: at * 10, done: false };
      },
    };
  },
};
console.log([...(iterable as any)].join(","));
`,
  },
  {
    id: "c330-rt-ternary-parenthesized-branch",
    title: "三元的两支带括号：值位不是类型位",
    src: `
const flag = true;
const n = flag ? (1 + 2) : 3;
const s = flag ? (() => "a")() : "b";
console.log(n, s);
`,
  },
  {
    id: "c330-ex-ternary-arrow-branches",
    title: "三元的两支是箭头函数：不套括号的写法",
    src: `
const flag = true;
const add = flag ? (a: number) => a + 1 : (a: number) => a - 1;
console.log(add(5));
const pick = flag ? () => "yes" : () => "no";
console.log(pick());
`,
  },
  {
    id: "c330-ex-object-literal-fn-name",
    title: "对象字面量里的函数值从属性名取名",
    src: `
const o = { f: () => 1, g: function () {}, "a-b": () => 2, ["c"]: () => 3 };
console.log(o.f.name, o.g.name, o["a-b"].name, o.c.name);
console.log({ n: null, f: () => 1 });
`,
  },
  {
    id: "c330-ex-class-field-fn-name",
    title: "类字段里的箭头从字段名取名",
    src: `
class K {
  f = () => 1;
  #n = () => 2;
  nName(): string {
    return this.#n.name;
  }
}
const k = new K();
console.log(k.f.name, k.nName());
`,
  },
  {
    id: "c330-rt-async-await-reject-in-try",
    title: "被拒绝的承诺：`await` 之后才拒绝的那一档",
    src: `
async function f(n: number): Promise<number> {
  await null;
  if (n === 2) throw new Error("boom");
  return n * 10;
}
async function run(): Promise<void> {
  const out: number[] = [];
  for (const n of [1, 2, 3]) {
    try {
      out.push(await f(n));
    } catch (e) {
      out.push(-1);
    }
  }
  console.log(out.join(","));
  const caught = await f(2).catch((e) => "caught:" + (e as Error).message);
  console.log(caught);
}
run();
`,
  },
  {
    id: "c330-std-number-parse-negzero",
    title: "`parseInt(\"-0\")` 保住负零",
    src: `
console.log(parseInt("-0"), 1 / parseInt("-0"));
console.log(parseInt("-5"), parseInt("+7"), parseFloat("-0"));
`,
  },
  {
    id: "c330-rt-number-precision-forms",
    title: "数值精度：安全整数边界与舍入",
    src: `
console.log(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(0.1 + 0.2 === 0.3, (0.1 + 0.2).toFixed(2));
console.log(9007199254740993, Number.isSafeInteger(9007199254740993));
`,
  },
  // ===== 第 331 轮收编（8 条）=====
  {
    id: "c331-rt-promise-reject-after-await",
    title: "`await` 之后才被拒绝：三条路一起走",
    src: `
async function f(n: number): Promise<number> {
  await null;
  if (n === 2) throw new Error("boom");
  return n;
}
async function run(): Promise<void> {
  for (const n of [1, 2, 3]) {
    const got = await f(n).then((v) => "ok" + v).catch((e) => "err" + (e as Error).message);
    console.log(got);
  }
  const caught = await (async () => {
    try {
      await f(2);
      return "no-throw";
    } catch (e) {
      return "caught:" + (e as Error).message;
    }
  })();
  console.log(caught);
}
run();
`,
  },
  {
    id: "c331-rt-promise-executor-throw-and-sync",
    title: "执行器里抛之后，同一段里的同步语句与微任务",
    src: `
const log: string[] = [];
new Promise(() => {
  log.push("exec");
  throw new Error("x");
}).catch((e) => log.push("catch:" + (e as Error).message));
log.push("sync");
Promise.resolve().then(() => {
  log.push("micro");
  console.log(log.join(","));
});
`,
  },
  {
    id: "c331-rt-generator-two-way-communication",
    title: "生成器：送进去的值与产出的值两条方向",
    src: `
function* accumulate(): Generator<number, number, number> {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const sent: number = yield total;
    total = total + sent;
  }
  return total;
}
const it = accumulate();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(5)));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(100)));
`,
  },
  {
    id: "c331-rt-try-catch-in-loops-and-functions",
    title: "`try` 在循环里、在函数里、套着 `finally`",
    src: `
function risky(n: number): number {
  try {
    if (n % 2 === 1) throw new Error("odd " + n);
    return n * 2;
  } catch (e) {
    return -1;
  } finally {
    // 只是观察：不改返回值
  }
}
const out: number[] = [];
for (const n of [1, 2, 3, 4]) out.push(risky(n));
console.log(out.join(","));
try {
  for (const n of [1, 2]) {
    if (n === 2) throw new Error("stop");
    out.push(n);
  }
} catch (e) {
  console.log("caught", (e as Error).message);
}
console.log(out.length);
`,
  },
  {
    id: "c331-rt-getter-setter-with-validation",
    title: "访问器里的校验与副作用",
    src: `
class Temperature {
  private celsius = 0;
  private reads = 0;
  get value(): number {
    this.reads = this.reads + 1;
    return this.celsius;
  }
  set value(next: number) {
    if (next < -273.15) throw new RangeError("below absolute zero");
    this.celsius = next;
  }
  get readCount(): number {
    return this.reads;
  }
}
const t = new Temperature();
t.value = 25;
console.log(t.value, t.value, t.readCount);
try {
  t.value = -300;
} catch (e) {
  console.log((e as Error).name, (e as Error).message.slice(0, 5));
}
console.log(t.value);
`,
  },
  {
    id: "c331-rt-array-methods-on-derived",
    title: "数组方法链：`map` / `filter` / `reduce` 一起用",
    src: `
const numbers = [5, 12, 8, 130, 44];
const result = numbers
  .filter((n) => n > 10)
  .map((n) => n * 2)
  .reduce((sum, n) => sum + n, 0);
console.log(result);
console.log(numbers.find((n) => n > 100), numbers.findIndex((n) => n > 100));
console.log(numbers.some((n) => n < 0), numbers.every((n) => n > 0));
`,
  },
  {
    id: "c331-rt-object-spread-and-rest",
    title: "对象展开与剩余：次序是语义",
    src: `
const base = { a: 1, b: 2 };
const over = { b: 3, c: 4 };
const merged = { ...base, ...over };
console.log(JSON.stringify(merged));
const { a, ...rest } = merged;
console.log(a, JSON.stringify(rest));
const nested = { ...base, inner: { ...over } };
console.log(nested.inner.b, base.b);
`,
  },
  {
    id: "c331-rt-string-methods-chain",
    title: "字符串方法的链式写法与边界实参",
    src: `
const text = "  Hello, World  ";
console.log(text.trim().toLowerCase().replace("world", "there"));
console.log("abc".padStart(6, "*"), "abc".padEnd(6, "-"));
console.log("a,b,c".split(",").map((part) => part.toUpperCase()).join(""));
console.log("repeat".repeat(2), "x".at(-1), "x".charCodeAt(0));
`,
  },
  // ===== 第 335 轮收编（2 条）=====
  {
    id: "c335-rt-array-subclass-and-species",
    title: "`extends Array` 的实例：进去是数组、出来也是数组",
    src: `
class MyList extends Array {
  constructor(items: number) {
    super();
    for (let i = 0; i < items; i++) this.push(i);
  }
  first() { return this[0]; }
}
const m = new MyList(3);
console.log(Array.isArray(m), m.length, m.first(), m instanceof MyList, m instanceof Array);
console.log(m.join("-"), m.slice(1).join("-"), m.map((v: number) => v * 2).join(","));
class Plain { constructor() {} }
const p = new Plain();
console.log(Array.isArray(p), p instanceof Plain);
`,
  },
  {
    id: "c335-rt-array-like-slice-forms",
    title: "类数组接收者：`slice` 的通用那一档",
    src: `
const like = { 0: "a", 1: "b", 2: "c", length: 3 };
console.log([].slice.call(like as any).join("-"));
console.log(Array.prototype.slice.call(like as any, 1).join("-"));
console.log([].slice.call(like as any, -2).join("-"));
console.log([].slice.call({ length: 0 } as any).length);
function args(): string {
  return ([] as any).slice.call(arguments as any, 1).join(",");
}
console.log(args("x", "y", "z"));
`,
  },
  // ===== 第 336 轮收编（2 条）=====
  {
    id: "c336-rt-generator-return-forms",
    title: "`return()` 的几种形状：没 finally、finally 里再 yield、已结束之后",
    src: `
function* plain() { yield 1; yield 2; }
const a = plain();
console.log(JSON.stringify(a.next()), JSON.stringify(a.return(7)), JSON.stringify(a.next()));
function* withCatch() {
  try { yield 1; } catch (e) { console.log("caught", e); } finally { console.log("fin"); }
}
const b = withCatch();
console.log(b.next().value, JSON.stringify(b.return(3)));
function* nested() {
  try { try { yield 1; } finally { console.log("inner"); } } finally { console.log("outer"); }
}
const c = nested();
console.log(c.next().value, JSON.stringify(c.return(5)));
function* resumed() { try { yield 1; yield 2; } finally { console.log("clean"); } }
const d = resumed();
console.log(d.next().value, d.next().value, JSON.stringify(d.return(4)));
`,
  },
  {
    id: "c336-rt-iterator-close-forms",
    title: "`for..of` 提前退出的收尾：break / return / 正常跑完",
    src: `
function* gen(tag: string) {
  try { yield 1; yield 2; yield 3; } finally { console.log("close", tag); }
}
for (const v of gen("break")) { console.log("got", v); break; }
function viaReturn(): void {
  for (const v of gen("return")) { console.log("got", v); return; }
  console.log("after return");
}
viaReturn();
function take(): number {
  for (const v of gen("func")) { if (v === 2) return v; }
  return -1;
}
console.log("took", take());
for (const v of gen("full")) { console.log("v", v); }
console.log("done");
`,
  },
  // ===== 第 337 轮收编（1 条）=====
  {
    id: "c337-rt-sloppy-this-forms",
    title: "非严格 `this` 的几档：普通调用 / 摘下来的方法 / call(undefined) / 回调",
    src: `
function who(this: any): string {
  return this === undefined ? "undefined" : this === globalThis ? "global" : "other";
}
console.log(who());
console.log(who.call(undefined), who.call(null), who.call({ tag: 1 }) === "other");
const obj = { tag: "obj", who };
const detached = obj.who;
console.log(detached(), obj.who(), detached.call(obj));
console.log([1].map(function (this: any) { return who.call(this); }).join(","));
const arrowThis = { tag: "lex", run() { return (() => this.tag)(); } };
console.log(arrowThis.run());
`,
  },
  // ===== 第 339 轮收编（1 条）=====
  {
    id: "c339-rt-for-await-defers-each-step",
    title: "`for await` 的每一轮至少让出一次（次序对齐 JS）",
    src: `
const order: string[] = [];
queueMicrotask(() => order.push("qm"));
Promise.resolve().then(() => order.push("then"));
async function* stream(): AsyncGenerator<number> {
  for (let i = 1; i <= 2; i++) yield i;
}
(async () => {
  const got: number[] = [];
  for await (const v of stream()) {
    got.push(v);
    order.push("body" + v);
  }
  console.log("A", got.join(","), order.join(","));
})();
console.log("sync", order.join(","));
const sync = [1, 2];
(async () => {
  const seen: number[] = [];
  for await (const v of sync) seen.push(v * 10);
  console.log("B", seen.join(","), order.join(","));
})();
`,
  },
  // ===== 第 340 轮收编（1 条）=====
  {
    id: "c340-rt-forin-prototype-chain",
    title: "`for..in` 沿原型链：自有 / 继承 / 被压住 / 不可枚举",
    src: `
const base: any = { b1: 1, b2: 2 };
base.hidden = 3;
Object.defineProperty(base, "hidden", { enumerable: false, value: 3, configurable: true, writable: true });
const child: any = Object.create(base);
child.own = 9;
const seen: string[] = [];
for (const k in child) seen.push(k);
console.log(seen.join(","));
class Shape { m() { return 1; } get g() { return 2; } }
const shape: any = new Shape();
shape.extra = 5;
const keys: string[] = [];
for (const k in shape) keys.push(k);
console.log(keys.join(","), Object.keys(shape).join(","));
const a: any = [10, 20];
const idx: string[] = [];
for (const k in a) idx.push(k);
console.log(idx.join(","));
const shadow: any = Object.create({ dup: "base", only: "base" });
shadow.dup = "own";
const s2: string[] = [];
for (const k in shadow) s2.push(k + "=" + shadow[k]);
console.log(s2.join(","));
`,
  },

  // ===== 第 371 轮：加宽矩阵收编的候选（75 条）=====
  {
    "id": "c371-rt-number-edge-values",
    "title": "数值边界：-0 / NaN / Infinity / 精度 / 溢出",
    "src": "console.log(1 / -0, Object.is(-0, 0), -0 + 0, Object.is(-0 + 0, 0));\nconsole.log(NaN === NaN, Number.isNaN(NaN), Infinity - Infinity);\nconsole.log(0.1 + 0.2, 1 / 3, 2 ** 53 + 1, 2 ** 53 + 1 === 2 ** 53);\nconsole.log(Number.MAX_VALUE * 2, Number.MIN_VALUE / 2, 1e308 * 10);\nconsole.log((0.1 + 0.2).toFixed(17));"
  },
  {
    "id": "c371-rt-bitwise-32bit",
    "title": "位运算的 32 位口径与移位计数",
    "src": "console.log(5 & 3, 5 | 3, 5 ^ 3, ~5, ~0);\nconsole.log(1 << 31, (1 << 31) >>> 0, -1 >>> 0, -1 >> 1);\nconsole.log(1 << 32, 1 << 33, 1 << -1, 1 >>> 32);\nconsole.log(0x7fffffff + 1, (0x7fffffff + 1) | 0, 2 ** 31 | 0);\nconsole.log(1.9 | 0, -1.9 | 0, NaN | 0, Infinity | 0);"
  },
  {
    "id": "c371-rt-equality-tables",
    "title": "相等三张表的差别：== / === / Object.is / SameValueZero",
    "src": "const pairs: [unknown, unknown][] = [[null, undefined], [0, \"\"], [\"0\", false], [NaN, NaN], [0, -0], [1, \"1\"], [[], \"\"], [[1], 1], [{}, \"[object Object]\"]];\nfor (const [a, b] of pairs) console.log(String(a == (b as any)), String(a === (b as any)), Object.is(a, b));\nconsole.log([NaN].includes(NaN), [0].includes(-0), [NaN].indexOf(NaN));"
  },
  {
    "id": "c371-rt-truthiness-full",
    "title": "真假值表：所有原始值与包装对象",
    "src": "const vals: any[] = [undefined, null, false, true, 0, -0, 1, NaN, \"\", \"0\", \"false\", [], [0], {}, function () {}, new Boolean(false), new Number(0), new String(\"\")];\nconsole.log(vals.map((v) => (v ? \"T\" : \"F\")).join(\"\"));\nconsole.log(Boolean(new Boolean(false)), !!new Boolean(false), Boolean(new String(\"\")));"
  },
  {
    "id": "c371-rt-property-semantics",
    "title": "属性语义：自有 / 继承 / 访问器 / 缺失 / 原型上的写",
    "src": "const proto: any = { inherited: 1, get computed() { return \"p\"; } };\nconst o: any = Object.create(proto);\no.own = 2;\nconsole.log(o.own, o.inherited, o.computed, o.missing, \"inherited\" in o, Object.hasOwn(o, \"inherited\"));\no.inherited = 3;\nconsole.log(o.inherited, proto.inherited, Object.hasOwn(o, \"inherited\"));\nconst arr = [1, 2, 3];\narr[5] = 6;\nconsole.log(arr.length, arr[4], arr[3], 3 in arr, JSON.stringify(arr));"
  },
  {
    "id": "c371-rt-array-vs-object-keys",
    "title": "数组下标键与普通字符串键在枚举上的分工",
    "src": "const a: any = [1, 2];\na.extra = \"e\";\na[-1] = \"neg\";\na[1.5] = \"frac\";\na[\"2\"] = 3;\nconsole.log(a.length, Object.keys(a).join(\",\"), JSON.stringify(a));\nconsole.log(a.extra, a[-1], a[\"1.5\"], a[2]);\nconsole.log(Array.isArray(a), a instanceof Array);"
  },
  {
    "id": "c371-rt-delete-semantics",
    "title": "delete：自有 / 继承 / 数组元素 / 不可配置",
    "src": "const o: any = { a: 1, b: 2 };\nconsole.log(delete o.a, o.a, \"a\" in o, Object.keys(o).join(\",\"));\nconst proto = { p: 1 };\nconst child: any = Object.create(proto);\nconsole.log(delete child.p, child.p, \"p\" in child);\nconst arr: any = [1, 2, 3];\nconsole.log(delete arr[1], arr.length, JSON.stringify(arr), 1 in arr);\nconst frozen: any = {};\nObject.defineProperty(frozen, \"f\", { value: 1, configurable: false });\nconsole.log(delete frozen.f, frozen.f);"
  },
  {
    "id": "c371-rt-prototype-chain-deep",
    "title": "深原型链上的读 / 写 / instanceof / isPrototypeOf",
    "src": "const a = { level: \"a\" };\nconst b = Object.create(a);\nconst c = Object.create(b);\nconst d = Object.create(c);\nconsole.log(d.level, a.isPrototypeOf(d), b.isPrototypeOf(d), d.isPrototypeOf(a));\nconsole.log(Object.getPrototypeOf(d) === c, Object.getPrototypeOf(Object.getPrototypeOf(c)) === b);\nd.level = \"d\";\nconsole.log(d.level, a.level);\nlet depth = 0;\nlet walk: any = d;\nwhile (walk !== null) { depth += 1; walk = Object.getPrototypeOf(walk); }\nconsole.log(depth);"
  },
  {
    "id": "c371-rt-class-field-init-order",
    "title": "字段初始化顺序：基类先、字段按书写、静态先于实例",
    "src": "const log: string[] = [];\nclass Base {\n  b1 = (log.push(\"b1\"), 1);\n  constructor() { log.push(\"base-ctor\"); }\n}\nclass Derived extends Base {\n  d1 = (log.push(\"d1\"), 1);\n  constructor() { super(); log.push(\"derived-ctor\"); this.d2 = (log.push(\"d2\"), 2); }\n  d2 = 0;\n}\nconst d = new Derived();\nconsole.log(log.join(\",\"), d.d1, d.d2);\nconst log2: string[] = [];\nclass S { static a = (log2.push(\"a\"), 1); static b = (log2.push(\"b\"), 2); }\nconsole.log(log2.join(\",\"), S.a + S.b);"
  },
  {
    "id": "c371-rt-private-fields-brand",
    "title": "私有字段：品牌检查、继承里的可见性、跨实例访问",
    "src": "class Vault {\n  #secret = 1;\n  static #shared = \"s\";\n  get secret(): number { return this.#secret; }\n  static same(a: Vault, b: Vault): boolean { return a.#secret === b.#secret; }\n  static brand(o: unknown): boolean { return #secret in (o as object); }\n  static shared(): string { return Vault.#shared; }\n}\nclass Sub extends Vault {}\nconst a = new Vault();\nconst b = new Vault();\nconsole.log(a.secret, Vault.same(a, b), Vault.brand(a), Vault.brand({}), Vault.brand(new Sub()));\nconsole.log(Vault.shared(), new Sub().secret);"
  },
  {
    "id": "c371-rt-super-and-this-binding",
    "title": "super 与 this：方法、箭头、解构、回调里的绑定",
    "src": "class Base {\n  v = 1;\n  m(): string { return \"B\" + this.v; }\n}\nclass Derived extends Base {\n  v = 2;\n  arrow = () => this.v;\n  callSuper(): string { return super.m(); }\n  detached(): () => string { return this.m; }\n  m(): string { return \"D\" + this.v; }\n}\nconst d = new Derived();\nconsole.log(d.callSuper(), d.m(), d.arrow());\nconst detached = d.detached();\ntry { console.log(detached()); } catch (e) { console.log(\"detached needs this\"); }\nconsole.log(d.arrow.call({} as any));"
  },
  {
    "id": "c371-rt-closure-env-forms",
    "title": "闭包与环境：循环变量、嵌套、共享与独立",
    "src": "const fns: (() => number)[] = [];\nfor (let i = 0; i < 3; i++) fns.push(() => i);\nconsole.log(fns.map((f) => f()).join(\",\"));\nconst varFns: (() => number)[] = [];\nfor (var j = 0; j < 3; j++) varFns.push(() => j);\nconsole.log(varFns.map((f) => f()).join(\",\"));\nfunction counter(): () => number { let n = 0; return () => (n += 1); }\nconst c1 = counter();\nconst c2 = counter();\nconsole.log(c1(), c1(), c2());\nconst shared: (() => number)[] = [];\n{ let x = 1; shared.push(() => x); x = 2; }\nconsole.log(shared[0]());"
  },
  {
    "id": "c371-rt-block-scope-and-tdz",
    "title": "块作用域、遮蔽、先声明后使用的顺序",
    "src": "let x = \"outer\";\n{\n  let x = \"block\";\n  console.log(x);\n}\nconsole.log(x);\nfunction f(): string {\n  let y = \"f\";\n  if (true) { let y = \"if\"; return y; }\n  return y;\n}\nconsole.log(f());\nconst order: string[] = [];\nfunction g(): void { order.push(typeof z); var z = 1; order.push(String(z)); }\ng();\nconsole.log(order.join(\",\"));\nconsole.log([1, 2, 3].map((n) => { const d = n * 2; return d; }).join(\",\"));"
  },
  {
    "id": "c371-rt-try-catch-finally-matrix",
    "title": "try / catch / finally 的六种收口方式",
    "src": "function a(): string { try { return \"t\"; } finally { console.log(\"f1\"); } }\nfunction b(): string { try { throw new Error(\"x\"); } catch { return \"c\"; } finally { console.log(\"f2\"); } }\nfunction c(): string { try { return \"t\"; } finally { return \"f\"; } }\nfunction d(): string { try { throw new Error(\"x\"); } finally { return \"f\"; } }\nfunction e(): string { try { return \"t\"; } catch { return \"c\"; } }\nfunction g(): string { let out = \"\"; try { out += \"t\"; } finally { out += \"f\"; } return out; }\nconsole.log(a(), b(), c(), d(), e(), g());\ntry { try { throw new Error(\"inner\"); } finally { console.log(\"f3\"); } } catch (err) { console.log(\"outer\", (err as Error).message); }"
  },
  {
    "id": "c371-rt-throw-non-error",
    "title": "抛原始值、抛对象、rethrow 与 finally 里的抛",
    "src": "for (const v of [\"s\", 1, null, undefined, { code: 1 }, [1, 2]]) {\n  try { throw v; } catch (e) { console.log(typeof e, JSON.stringify(e)); }\n}\ntry {\n  try { throw new Error(\"orig\"); } catch (e) { throw new Error(\"wrapped: \" + (e as Error).message); }\n} catch (e) { console.log((e as Error).message); }\ntry {\n  try { throw new Error(\"a\"); } finally { throw new Error(\"b\"); }\n} catch (e) { console.log(\"winner\", (e as Error).message); }"
  },
  {
    "id": "c371-rt-iteration-protocol-forms",
    "title": "迭代协议：手动 next、提前退出、return() 收尾",
    "src": "const iterable = {\n  data: [1, 2, 3],\n  [Symbol.iterator]() {\n    let i = 0;\n    const self = this;\n    return {\n      next: () => (i < self.data.length ? { value: self.data[i++], done: false } : { value: undefined, done: true }),\n      return: () => { console.log(\"closed\"); return { value: undefined, done: true }; },\n    };\n  },\n};\nconsole.log([...iterable].join(\",\"));\nfor (const v of iterable) { if (v === 2) break; console.log(\"got\", v); }\nconst it = iterable[Symbol.iterator]();\nconsole.log(JSON.stringify(it.next()), JSON.stringify(it.next()));\nconsole.log([...iterable].length, Array.from(iterable).length);"
  },
  {
    "id": "c371-rt-generator-forms",
    "title": "生成器：传值、委托、return、throw、提前结束",
    "src": "function* twoWay() {\n  const a = yield 1;\n  const b = yield a + 1;\n  return a + b;\n}\nconst g = twoWay();\nconsole.log(JSON.stringify(g.next()), JSON.stringify(g.next(10)), JSON.stringify(g.next(20)));\nfunction* inner() { yield \"i1\"; yield \"i2\"; }\nfunction* outer() { yield \"o1\"; yield* inner(); yield \"o2\"; }\nconsole.log([...outer()].join(\",\"));\nfunction* withReturn() { try { yield 1; yield 2; } finally { console.log(\"gen-finally\"); } }\nconst h = withReturn();\nconsole.log(JSON.stringify(h.next()), JSON.stringify(h.return(9)));\nfunction* catcher() { try { yield 1; } catch (e) { console.log(\"caught\", (e as Error).message); } }\nconst k = catcher();\nk.next();\nk.throw(new Error(\"into\"));\nconsole.log([...k].length);"
  },
  {
    "id": "c371-rt-for-of-vs-for-in",
    "title": "for..of 与 for..in 走过的东西不一样",
    "src": "const arr = [10, 20, 30];\nfor (const v of arr) console.log(\"of\", v);\nfor (const k in arr) console.log(\"in\", k, typeof k);\nconst o = { a: 1, b: 2 };\nfor (const k in o) console.log(\"obj\", k, o[k as \"a\"]);\nconst s = \"ab\";\nfor (const ch of s) console.log(\"str\", ch);\nfor (const k in s) console.log(\"strk\", k);\nconst m = new Map([[\"k\", 1]]);\nfor (const [key, v] of m) console.log(\"map\", key, v);"
  },
  {
    "id": "c371-rt-promise-chaining-values",
    "title": "承诺链：值的透传、返回承诺、链上抛错",
    "src": "Promise.resolve(1)\n  .then((v) => v + 1)\n  .then((v) => Promise.resolve(v * 10))\n  .then((v) => { console.log(\"final\", v); return v; })\n  .then((v) => { throw new Error(\"at \" + v); })\n  .catch((e) => \"recovered:\" + (e as Error).message)\n  .then((v) => console.log(v));\nPromise.resolve(\"a\").then(() => {}).then((v) => console.log(\"undefined-passthrough\", v === undefined));\nPromise.reject(new Error(\"r1\")).then(() => console.log(\"skip\")).catch((e) => console.log(\"c1\", (e as Error).message));\nconsole.log(\"sync\");"
  },
  {
    "id": "c371-rt-async-await-order",
    "title": "async / await 的执行顺序与返回值",
    "src": "async function f(): Promise<number> {\n  console.log(\"f-start\");\n  const a = await Promise.resolve(1);\n  console.log(\"f-mid\");\n  const b = await 2;\n  console.log(\"f-end\");\n  return a + b;\n}\nconsole.log(\"before\");\nf().then((v) => console.log(\"result\", v));\nconsole.log(\"after\");\n(async () => {\n  for (const v of [1, 2]) {\n    const r = await Promise.resolve(v * 10);\n    console.log(\"loop\", r);\n  }\n})();"
  },
  {
    "id": "c371-rt-async-error-paths",
    "title": "async 里的抛错 / 拒绝 / try-catch / finally",
    "src": "async function boom(): Promise<void> { throw new Error(\"boom\"); }\nasync function reject(): Promise<void> { await Promise.reject(new Error(\"rej\")); }\nasync function guarded(): Promise<string> {\n  try { await boom(); return \"no\"; } catch (e) { return \"caught:\" + (e as Error).message; } finally { console.log(\"fin\"); }\n}\nboom().catch((e) => console.log(\"1\", (e as Error).message));\nreject().catch((e) => console.log(\"2\", (e as Error).message));\nguarded().then((v) => console.log(\"3\", v));\n(async () => { try { await Promise.reject(\"raw\"); } catch (e) { console.log(\"4\", e); } })();"
  },
  {
    "id": "c371-rt-map-set-identity",
    "title": "Map / Set 的身份语义与迭代中的修改",
    "src": "const m = new Map<any, number>();\nconst key = { id: 1 };\nm.set(key, 1);\nm.set({ id: 1 }, 2);\nconsole.log(m.size, m.get(key));\nfor (const [k, v] of m) { }\nconst seen: string[] = [];\nm.forEach((v, k) => seen.push(String(v)));\nconsole.log(seen.join(\",\"), m.has(key));\nconst s = new Set<number>([1, 2, 3]);\nfor (const v of s) { if (v === 2) s.delete(3); }\nconsole.log([...s].join(\",\"), s.size);"
  },
  {
    "id": "c371-rt-object-spread-and-rest",
    "title": "对象展开与剩余：符号键、访问器、原型属性",
    "src": "const sym = Symbol(\"s\");\nconst proto = { inherited: 1 };\nconst src: any = Object.create(proto);\nsrc.own = 2;\nsrc[sym] = 3;\nconst copy = { ...src };\nconsole.log(JSON.stringify(copy), Object.getOwnPropertySymbols(copy).length, (copy as any).inherited);\nconst { own, ...rest } = src;\nconsole.log(own, JSON.stringify(rest), Object.getOwnPropertySymbols(rest).length);\nlet reads = 0;\nconst withGetter: any = {};\nObject.defineProperty(withGetter, \"g\", { get() { reads += 1; return reads; }, enumerable: true });\nconst spread = { ...withGetter };\nconsole.log(spread.g, reads);"
  },
  {
    "id": "c371-rt-array-methods-chain-deep",
    "title": "长数组方法链上的中间值与惰性",
    "src": "const xs = Array.from({ length: 10 }, (_, i) => i);\nconst result = xs\n  .map((v) => v * 2)\n  .filter((v) => v % 4 === 0)\n  .map((v) => v + 1)\n  .reduce((a, b) => a + b, 0);\nconsole.log(result);\nlet calls = 0;\nconst counted = xs.filter((v) => { calls += 1; return v > 5; });\nconsole.log(counted.length, calls);\nconsole.log(xs.slice(2, 5).join(\",\"), xs.splice(0, 0).length, xs.length);"
  },
  {
    "id": "c371-rt-string-builder-stress",
    "title": "字符串拼接的压力：一万次追加与连接",
    "src": "let acc = \"\";\nfor (let i = 0; i < 10000; i++) acc += i % 10;\nconsole.log(acc.length, acc.slice(0, 5), acc.slice(-5));\nconst parts: string[] = [];\nfor (let i = 0; i < 5000; i++) parts.push(\"x\" + (i % 7));\nconsole.log(parts.join(\"\").length, parts.length);\nconst big = \"ab\".repeat(20000);\nconsole.log(big.length, big.slice(0, 2), big.indexOf(\"ab\", 1000));"
  },
  {
    "id": "c371-rt-large-collections",
    "title": "大集合的压力：一万条 Map / Set / 数组",
    "src": "const m = new Map<number, number>();\nfor (let i = 0; i < 10000; i++) m.set(i, i * 2);\nconsole.log(m.size, m.get(9999), m.has(10000));\nconst s = new Set<number>();\nfor (let i = 0; i < 10000; i++) s.add(i % 1000);\nconsole.log(s.size, s.has(999), s.has(1000));\nconst arr: number[] = [];\nfor (let i = 0; i < 10000; i++) arr.push(i);\nconsole.log(arr.length, arr[9999], arr.reduce((a, b) => a + b, 0));"
  },
  {
    "id": "c371-rt-recursion-depth",
    "title": "递归深度：线性递归、树递归、相互递归",
    "src": "function sum(n: number): number { return n === 0 ? 0 : n + sum(n - 1); }\nconsole.log(sum(2000));\nfunction fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }\nconsole.log(fib(20));\nfunction isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }\nfunction isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }\nconsole.log(isEven(1000), isOdd(7));\ntype Tree = { v: number; kids: Tree[] };\nconst tree: Tree = { v: 1, kids: [{ v: 2, kids: [] }, { v: 3, kids: [{ v: 4, kids: [] }] }] };\nfunction totalOf(t: Tree): number { return t.v + t.kids.reduce((a, k) => a + totalOf(k), 0); }\nconsole.log(totalOf(tree));"
  },
  {
    "id": "c371-rt-deep-object-graph",
    "title": "深对象图：建立、遍历、序列化",
    "src": "type N = { id: number; next?: N };\nlet head: N | undefined = undefined;\nfor (let i = 50; i >= 0; i--) head = { id: i, next: head };\nlet count = 0;\nlet walk = head;\nconst ids: number[] = [];\nwhile (walk) { count += 1; if (walk.id % 10 === 0) ids.push(walk.id); walk = walk.next; }\nconsole.log(count, ids.join(\",\"));\nconst json = JSON.stringify(head);\nconsole.log(json.length, JSON.parse(json).id);\nconst tree: any = { name: \"root\", children: [] };\nlet cursor = tree;\nfor (let i = 0; i < 30; i++) { const child = { name: \"n\" + i, children: [] }; cursor.children.push(child); cursor = child; }\nlet depth = 0;\nlet probe: any = tree;\nwhile (probe.children.length > 0) { depth += 1; probe = probe.children[0]; }\nconsole.log(depth, probe.name);"
  },
  {
    "id": "c371-rt-string-unicode-forms",
    "title": "Unicode：代理对、码点、长度、切片",
    "src": "const s = \"a\\u{1F600}b\\u{1F601}c\";\nconsole.log(s.length, [...s].length, Array.from(s).map((c) => c.length).join(\",\"));\nconsole.log(s.charAt(1).charCodeAt(0), s.charCodeAt(1), s.codePointAt(1));\nconsole.log(s.slice(0, 3).length, s.substring(1, 3).length);\nconsole.log(JSON.stringify(s), s.split(\"\").length, s.split(\"b\").length);\nconsole.log(s.indexOf(\"b\"), s.includes(\"\\u{1F600}\"), s.lastIndexOf(\"c\"));"
  },
  {
    "id": "c371-rt-number-to-string-table",
    "title": "数字转文本的完整口径",
    "src": "const nums = [0, -0, 1, -1, 0.5, 1e21, 1e-7, 1e-6, NaN, Infinity, -Infinity, 123456789012345680000];\nfor (const n of nums) console.log(String(n));\nconsole.log(String(0.1 + 0.2), String(1 / 3), (1234.5678).toFixed(2), (0.000001).toString());\nconsole.log(`${1e21}`, `${1e-7}`, `${-0}`);"
  },
  {
    "id": "c371-rt-json-deep-and-specials",
    "title": "JSON 深结构与特殊值：undefined、函数、稀疏数组",
    "src": "const deep: any = { a: { b: { c: { d: [1, [2, [3, [4]]]] } } } };\nconsole.log(JSON.stringify(deep));\nconsole.log(JSON.stringify({ u: undefined, f: () => 0, n: null }));\nconst sparse: any[] = [1, , 3];\nconsole.log(JSON.stringify(sparse), JSON.stringify(Array.from(sparse)));\nconsole.log(JSON.stringify({ d: new Date(0) }));\nconsole.log(JSON.stringify({ nested: { arr: [{ x: 1 }, { y: [true, false] }] } }));"
  },
  {
    "id": "c371-rt-getter-on-prototype-chain",
    "title": "访问器沿原型链的查找与 this",
    "src": "const base = {\n  _v: 1,\n  get v() { return this._v; },\n  set v(x: number) { this._v = x * 10; },\n};\nconst child: any = Object.create(base);\nchild._v = 2;\nconsole.log(child.v, base.v);\nchild.v = 3;\nconsole.log(child._v, child.v, base._v, Object.hasOwn(child, \"v\"));\nconst grandchild = Object.create(child);\nconsole.log(grandchild.v);\ngrandchild.v = 4;\nconsole.log(grandchild.v, child._v, Object.hasOwn(grandchild, \"_v\"));"
  },
  {
    "id": "c371-rt-symbol-keyed-properties",
    "title": "符号键：不参与枚举 / JSON / for..in，但参与取值",
    "src": "const s1 = Symbol(\"a\");\nconst s2 = Symbol.for(\"b\");\nconst o: any = { plain: 1, [s1]: 2, [s2]: 3, [Symbol.iterator]: function* () { yield 9; } };\nconsole.log(o[s1], o[s2], o.plain, Object.keys(o).join(\",\"), JSON.stringify(o));\nfor (const k in o) console.log(\"in\", k);\nconsole.log([...o].join(\",\"), Object.getOwnPropertySymbols(o).length);"
  },
  {
    "id": "c371-rt-instanceof-and-prototype",
    "title": "instanceof 与原型替换、跨类判定",
    "src": "class A {}\nclass B extends A {}\nclass C extends B {}\nconst c = new C();\nconsole.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);\nconsole.log(Object.getPrototypeOf(C) === B, Object.getPrototypeOf(c) === C.prototype);\nconst o = Object.create(C.prototype);\nconsole.log(o instanceof C, o instanceof A);\nC.prototype = {} as any;\nconsole.log(c instanceof C, o instanceof C, new C() instanceof A);"
  },
  {
    "id": "c371-rt-object-to-primitive-hints",
    "title": "ToPrimitive 的三种 hint 与顺序",
    "src": "const log: string[] = [];\nconst o = {\n  valueOf() { log.push(\"valueOf\"); return 1; },\n  toString() { log.push(\"toString\"); return \"T\"; },\n};\nconsole.log(o + 1, log.join(\",\"));\nlog.length = 0;\nconsole.log(String(o), log.join(\",\"));\nlog.length = 0;\nconsole.log(Number(o), log.join(\",\"));\nlog.length = 0;\nconsole.log(`${o}`, log.join(\",\"));\nconst onlyValue = { valueOf() { return 5; } };\nconsole.log(onlyValue + \"\", String(onlyValue), Number(onlyValue));"
  },
  {
    "id": "c371-rt-array-holes-everywhere",
    "title": "稀疏数组：洞在每一种方法下的命运",
    "src": "const xs: any[] = [1, , 3];\nconsole.log(xs.length, 1 in xs, xs[1], JSON.stringify(xs));\nconsole.log(xs.map((v) => v * 2).length, 1 in xs.map((v) => v * 2));\nconsole.log(xs.filter(() => true).length, [...xs].length, Array.from(xs).length);\nconsole.log(xs.join(\"-\"), xs.indexOf(undefined), xs.includes(undefined));\nconsole.log(Object.keys(xs).join(\",\"), xs.every((v) => v !== undefined), xs.some((v) => v === undefined));"
  },
  {
    "id": "c371-rt-date-arithmetic-forms",
    "title": "日期的创建、算术与比较",
    "src": "const a = new Date(Date.UTC(2020, 0, 1));\nconst b = new Date(Date.UTC(2020, 11, 31));\nconsole.log(b.getTime() - a.getTime(), a < b, a.getTime() === a.getTime());\nconsole.log(new Date(a.getTime() + 86400000).toISOString().slice(0, 10));\nconst times = [a, b].sort((x, y) => x.getTime() - y.getTime());\nconsole.log(times.map((d) => d.toISOString().slice(0, 4)).join(\",\"));\nconsole.log(Number(a) === a.getTime(), a.toISOString().length, JSON.stringify(a).slice(1, 5));"
  },
  {
    "id": "c371-rt-arguments-object",
    "title": "arguments：类数组、与形参的联动、箭头里没有",
    "src": "function f(a: number, b: number): string {\n  console.log(arguments.length, arguments[0], arguments[2]);\n  const out: number[] = [];\n  for (let i = 0; i < arguments.length; i++) out.push(arguments[i]);\n  a = 99;\n  return out.join(\",\") + \"/\" + a + \"/\" + b;\n}\nconsole.log(f(1, 2, 3));\nfunction g(...rest: number[]): string { return rest.join(\"-\") + \"/\" + Array.isArray(rest); }\nconsole.log(g(1, 2));\nconst arrow = (...xs: number[]) => xs.length;\nconsole.log(arrow(1, 2, 3));"
  },
  {
    "id": "c371-rt-frames-and-default-params",
    "title": "默认参数与实参个数：undefined 触发、null 不触发",
    "src": "function f(a: number = 1, b: string = \"b\", c?: number): string { return [a, b, c].join(\",\"); }\nconsole.log(f(), f(2), f(2, \"x\"), f(undefined, \"y\"), f(null as any, \"z\"), f(1, undefined, 3));\nfunction g(a: number, b: number = a * 2, c: number = b + a): number { return a + b + c; }\nconsole.log(g(1), g(1, 2), g(1, 2, 3));\nfunction h(...rest: number[]): number { return rest.length; }\nconsole.log(h(), h(1), h(1, 2, 3), h.length);"
  },
  {
    "id": "c371-rt-console-inspect-shapes",
    "title": "console.log 对复杂值的渲染",
    "src": "console.log([1, 2, 3], [[1], [2]]);\nconsole.log({ a: 1, b: [1, 2], c: { d: null } });\nconsole.log(new Map([[\"k\", 1]]), new Set([1, 2]));\nconsole.log(new Date(0), new Error(\"e\").message);\nconsole.log([undefined, null, NaN, -0, Infinity]);\nconsole.log({ fn: function named() {}, arrow: () => 0, cls: class C {} });"
  },
  {
    "id": "c371-rt-string-method-numeric-args",
    "title": "字符串方法收到小数 / 负数 / NaN 实参时的取值口径",
    "src": "const s = \"abcdefgh\";\nconsole.log(s.slice(1.5, 3.9), s.substring(1.5, 3.9), s.substr(1.5, 3.9));\nconsole.log(s.indexOf(\"c\", 1.5), s.lastIndexOf(\"c\", 3.9));\nconsole.log(JSON.stringify(s.split(\"\", 2.9)));\nconsole.log(\"x\".repeat(3.9), \"x\".padStart(5.9, \"0\"));\nconsole.log(s.charAt(1.5), s.charCodeAt(1.5), s.at(1.5));"
  },
  {
    "id": "c371-rt-array-method-numeric-args",
    "title": "数组方法收到小数 / 负数 / 越界实参",
    "src": "const xs = [1, 2, 3, 4, 5];\nconsole.log(JSON.stringify(xs.slice(1.5, 3.9)), JSON.stringify(xs.slice(-2.5)));\nconsole.log(JSON.stringify(xs.splice(1.5, 2.5)), JSON.stringify(xs));\nconsole.log(JSON.stringify([1, 2, 3].fill(9, 1.5)), JSON.stringify([1, 2, 3].copyWithin(0, 1.5)));\nconsole.log([1, 2, 3].indexOf(2, 1.5), [1, 2, 3].includes(2, 1.5), [1, 2, 3].at(1.5));\nconsole.log([1, 2, 3].join().length, JSON.stringify([1, 2, 3].concat(4).slice(NaN)));"
  },
  {
    "id": "c371-rt-logical-and-nullish-forms",
    "title": "逻辑运算与空值合并：短路、返回值、赋值的结合",
    "src": "const a = 0 || \"fallback\";\nconst b = \"\" && \"never\";\nconst c = null ?? \"d\";\nconst d = 0 ?? \"e\";\nconst e = undefined ?? null ?? \"last\";\nconsole.log(a, JSON.stringify(b), c, d, e);\nlet n: number | null = null;\nn ??= 5;\nconsole.log(n);\nn ||= 9;\nconsole.log(n);\nn &&= 0;\nconsole.log(n);\nconst o: any = { v: { deep: 1 } };\nconsole.log(o?.v?.deep ?? \"no\", o.x?.y ?? \"no2\", o.v.deep ?? \"no3\");"
  },
  {
    "id": "c371-rt-computed-keys-evaluation",
    "title": "计算键与取值顺序（键先于值、从左到右）",
    "src": "const log: string[] = [];\nfunction key(name: string): string { log.push(\"key:\" + name); return name; }\nfunction val(name: string, v: number): number { log.push(\"val:\" + name); return v; }\nconst o = { [key(\"a\")]: val(\"a\", 1), [key(\"b\")]: val(\"b\", 2) };\nconsole.log(log.join(\",\"), JSON.stringify(o));\nlog.length = 0;\nconst arr = [val(\"x\", 1), val(\"y\", 2)];\nconsole.log(log.join(\",\"), arr.join(\",\"));\nlog.length = 0;\nclass C { [key(\"m\")](): number { return val(\"m\", 3); } }\nconsole.log(log.join(\",\"), new C().m());\nconst spread = { ...(val(\"s\", 0), { k: 1 }) };\nconsole.log(JSON.stringify(spread));"
  },
  {
    "id": "c371-rt-gc-churn-forms",
    "title": "分配压力：反复建造与丢弃对象",
    "src": "let last = 0;\nfor (let i = 0; i < 20000; i++) {\n  const o = { a: i, b: [i, i + 1], c: \"s\" + i };\n  last = o.b[0];\n}\nconsole.log(last);\nconst pooled: number[][] = [];\nfor (let i = 0; i < 2000; i++) pooled.push(new Array(10).fill(i));\nconsole.log(pooled.length, pooled[1999][9]);\nconst strings: string[] = [];\nfor (let i = 0; i < 3000; i++) strings.push(String(i));\nconsole.log(strings.join(\"\").length);\nconsole.log(\"done\");"
  },
  {
    "id": "c371-rt-shared-mutable-state",
    "title": "共享可变状态：模块级对象、闭包、实例之间",
    "src": "const registry: Record<string, number> = {};\nfunction bump(k: string): number { registry[k] = (registry[k] ?? 0) + 1; return registry[k]; }\nconsole.log(bump(\"a\"), bump(\"a\"), bump(\"b\"), JSON.stringify(registry));\nconst counters = { total: 0 };\nclass Inc { constructor(public bag: { total: number }) {} add(): void { this.bag.total += 1; } }\nconst a = new Inc(counters);\nconst b = new Inc(counters);\na.add();\nb.add();\nconsole.log(counters.total, Object.keys(registry).length);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-rt-switch-and-jump-forms",
    "title": "switch 的严格相等、贯穿、与表达式求值次数",
    "src": "function classify(v: unknown): string {\n  switch (v) {\n    case \"1\": return \"string-1\";\n    case 1: return \"number-1\";\n    case true: return \"true\";\n    case null: return \"null\";\n    case undefined: return \"undefined\";\n    default: return \"other\";\n  }\n}\nconsole.log(classify(\"1\"), classify(1), classify(true), classify(null), classify(undefined), classify(0));\nlet evaluated = 0;\nfunction pick(v: number): number { evaluated += 1; return v; }\nswitch (pick(2)) {\n  case 1: console.log(\"one\"); break;\n  case 2:\n  case 3: console.log(\"two-or-three\"); break;\n  default: console.log(\"default\");\n}\nconsole.log(evaluated);"
  },
  {
    "id": "c371-rt-ternary-and-conditional-chains",
    "title": "三元与条件的嵌套、赋值、短路",
    "src": "const score = 75;\nconst grade = score >= 90 ? \"A\" : score >= 80 ? \"B\" : score >= 70 ? \"C\" : \"F\";\nconsole.log(grade);\nlet n = 0;\nconst r = true ? (n = 1, \"t\") : (n = 2, \"f\");\nconsole.log(r, n);\nconst nested = (1 ? (0 ? \"a\" : \"b\") : \"c\") + (null ? \"x\" : \"y\");\nconsole.log(nested);\nlet flag = false;\nconst side = flag ? (flag = true, \"set\") : \"unset\";\nconsole.log(side, flag);\nconsole.log([1, 2, 3].map((v) => (v % 2 ? \"odd\" : \"even\")).join(\",\"));"
  },
  {
    "id": "c371-rt-class-static-and-instance-isolation",
    "title": "静态与实例成员的隔离，静态块里的 this",
    "src": "class Config {\n  static defaults: Record<string, number> = { a: 1 };\n  static instances = 0;\n  private data: Record<string, number>;\n  constructor(overrides: Record<string, number> = {}) {\n    this.data = { ...Config.defaults, ...overrides };\n    Config.instances += 1;\n  }\n  get(key: string): number { return this.data[key]; }\n  static { Config.defaults.extra = Config.defaults.a + 1; }\n}\nconst a = new Config();\nconst b = new Config({ a: 10 });\na.data[\"a\"] = 99;\nconsole.log(a.get(\"a\"), b.get(\"a\"), Config.defaults.a, Config.defaults.extra, Config.instances);\nconsole.log(Object.keys(a).join(\",\"), Object.keys(Config).join(\",\"));"
  },
  {
    "id": "c371-rt-interface-free-duck-typing",
    "title": "鸭子类型：结构化对象在运行期只是一组键",
    "src": "type Point = { x: number; y: number };\ntype Move = (p: Point, by: number) => Point;\nconst move: Move = (p, by) => ({ x: p.x + by, y: p.y + by });\nconst points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 2 }];\nconsole.log(points.map((p) => move(p, 1)).map((p) => p.x + \":\" + p.y).join(\",\"));\nconst asJson = JSON.parse('[{\"x\":3,\"y\":4}]') as Point[];\nconsole.log(asJson[0].x, asJson.length, \"x\" in asJson[0], \"z\" in asJson[0]);\nfunction area(p: Point): number { return p.x * p.y; }\nconsole.log(points.map(area).join(\",\"));"
  },
  {
    "id": "c371-rt-error-catch-and-rethrow",
    "title": "错误的捕获、分类、重抛与 finally 的清理",
    "src": "function parseNumber(text: string): number {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new TypeError(\"not a number: \" + text);\n  if (!Number.isFinite(n)) throw new RangeError(\"not finite: \" + text);\n  return n;\n}\nfor (const t of [\"1\", \"x\", \"Infinity\"]) {\n  try { console.log(\"ok\", parseNumber(t)); }\n  catch (e) {\n    const err = e as Error;\n    console.log(err instanceof TypeError ? \"T\" : err instanceof RangeError ? \"R\" : \"?\", err.message);\n  }\n}\nconst cleanups: string[] = [];\nfunction work(fail: boolean): string {\n  try { if (fail) throw new Error(\"w\"); return \"done\"; }\n  catch (e) { cleanups.push(\"catch\"); throw e; }\n  finally { cleanups.push(\"finally\"); }\n}\ntry { work(true); } catch (e) { cleanups.push(\"outer\"); }\nconsole.log(cleanups.join(\",\"), work(false));"
  },
  {
    "id": "c371-rt-nested-functions-hoisting",
    "title": "函数声明的提升与嵌套定义",
    "src": "console.log(typeof outer, outer());\nfunction outer(): string { return \"outer:\" + inner(); }\nfunction inner(): string { return \"inner\"; }\nconsole.log(typeof inner);\nfunction make(): string {\n  const before = later();\n  function later(): string { return \"later\"; }\n  return before;\n}\nconsole.log(make());\nconst expr = function namedExpr(): string { return \"named\"; };\nconsole.log(expr(), expr.name);\nconsole.log(typeof hoisted, hoisted());\nfunction hoisted(): string { return \"h\"; }"
  },
  {
    "id": "c371-rt-label-and-loop-forms",
    "title": "循环的四种写法与标签控制",
    "src": "const out: string[] = [];\nfor (let i = 0; i < 3; i++) out.push(\"f\" + i);\nlet j = 0;\nwhile (j < 2) { out.push(\"w\" + j); j += 1; }\nlet k = 0;\ndo { out.push(\"d\" + k); k += 1; } while (k < 2);\nconst obj = { a: 1, b: 2 };\nfor (const key in obj) out.push(\"i\" + key);\nouter: for (const x of [1, 2, 3]) {\n  for (const y of [1, 2]) {\n    if (y === 2) continue outer;\n    if (x === 3) break outer;\n    out.push(\"n\" + x + y);\n  }\n}\nconsole.log(out.join(\",\"));"
  },
  {
    "id": "c371-rt-value-vs-reference-arguments",
    "title": "实参传递：原始值拷贝、对象引用共享、重新赋值",
    "src": "function mutate(n: number, o: { v: number }, arr: number[]): void {\n  n = 99;\n  o.v = 99;\n  arr.push(99);\n  arr = [0];\n}\nlet n = 1;\nconst o = { v: 1 };\nconst arr = [1];\nmutate(n, o, arr);\nconsole.log(n, o.v, JSON.stringify(arr));\nfunction replace(o: { v: number }): void { o = { v: 5 }; }\nconst keep = { v: 1 };\nreplace(keep);\nconsole.log(keep.v);\nconst shared = { v: 1 };\nconst alias = shared;\nalias.v = 2;\nconsole.log(shared.v, shared === alias, { v: 2 }.v === shared.v);"
  },
  {
    "id": "c371-rt-string-vs-number-coercion-ops",
    "title": "运算符两侧的强制转换：+ - * / 与比较",
    "src": "console.log(\"1\" + 1, \"1\" - 1, \"3\" * \"2\", \"10\" / \"2\", \"5\" % \"2\");\nconsole.log(1 + \"2\" + 3, 1 + 2 + \"3\", \"a\" + null, \"a\" + undefined);\nconsole.log([] + [], [] + {}, [1] + [2], [1, 2] + 3);\nconsole.log(\"2\" > 1, \"2\" > \"10\", 2 > \"10\", null >= 0, undefined >= 0);\nconsole.log(true + true, false - 1, +true, +\"\", +\" 1 \");"
  },
  {
    "id": "c371-rt-iteration-of-builtins",
    "title": "内建可迭代对象：数组 / 字符串 / Map / Set / 生成器",
    "src": "const sources: [string, Iterable<unknown>][] = [\n  [\"array\", [1, 2]],\n  [\"string\", \"ab\"],\n  [\"map\", new Map([[\"k\", 1]])],\n  [\"set\", new Set([1])],\n  [\"generator\", (function* () { yield \"g\"; })()],\n  [\"entries\", [1, 2].entries()],\n];\nfor (const [name, it] of sources) console.log(name, [...it].length);\nconsole.log([...\"abc\"].join(\"-\"), [...new Set([1, 1, 2])].join(\",\"));\nfunction* range(n: number) { for (let i = 0; i < n; i++) yield i; }\nconsole.log([...range(5)].join(\",\"), Array.from(range(3)).join(\",\"));\nconst [first, ...rest] = range(4);\nconsole.log(first, rest.join(\",\"));"
  },
  {
    "id": "c371-rt-object-keys-stability",
    "title": "键顺序在增删之后仍然稳定",
    "src": "const o: any = { c: 1, a: 2, 2: 3, 1: 4, b: 5 };\nconsole.log(Object.keys(o).join(\",\"));\ndelete o.a;\no.a = 6;\nconsole.log(Object.keys(o).join(\",\"));\no[\"10\"] = 7;\no[\"3\"] = 8;\nconsole.log(Object.keys(o).join(\",\"));\nconsole.log(Object.values(o).join(\",\"));\nconst m = new Map<string, number>();\nm.set(\"z\", 1); m.set(\"a\", 2); m.set(\"z\", 3);\nconsole.log([...m.keys()].join(\",\"));"
  },
  {
    "id": "c371-rt-function-name-and-length",
    "title": "函数的 name / length 在各种定义形态下",
    "src": "function decl(a: number, b: number, c = 1) {}\nconst arrow = (a: number, b = 2) => a + b;\nconst assigned = function (a: number) { return a; };\nconst method = { m(a: number, b: number) { return a + b; } };\nconst cls = class Named { m(a: number) {} };\nconsole.log(decl.name, decl.length, arrow.name, arrow.length, assigned.name, assigned.length);\nconsole.log(method.m.name, method.m.length, cls.name, cls.prototype.m.name.length >= 0);\nconst bound = decl.bind(null);\nconsole.log(bound.name, bound.length);\nconst computed = { [\"k\" + 1]() {} };\nconsole.log(Object.keys(computed).join(\",\"), (computed as any).k1.name);"
  },
  {
    "id": "c371-rt-bind-call-apply-forms",
    "title": "bind / call / apply 的 this 与实参形态",
    "src": "function who(this: any, ...rest: unknown[]): string { return String(this && this.tag) + \":\" + rest.join(\"|\"); }\nconsole.log(who.call({ tag: \"o\" }, 1, 2));\nconsole.log(who.apply({ tag: \"a\" }, [3, 4]));\nconst bound = who.bind({ tag: \"b\" }, 5);\nconsole.log(bound(6, 7));\nconsole.log(who.call(null as any, 1), who.apply(undefined as any, []));\nconst obj = { tag: \"m\", who };\nconsole.log(obj.who(8));\nconst detached = obj.who;\nconsole.log(typeof detached(9));"
  },
  {
    "id": "c371-rt-nested-destructuring-defaults",
    "title": "嵌套解构的缺省与 undefined 触发",
    "src": "const data: any = { a: { b: [{ c: 1 }] } };\nconst { a: { b: [{ c }] } } = data;\nconsole.log(c);\nconst { x = 1, y: { z = 2 } = {}, ...rest } = { y: {}, extra: 3 } as any;\nconsole.log(x, z, JSON.stringify(rest));\nconst [p = 1, [q = 2] = [], ...others] = [undefined, [], 3, 4] as any;\nconsole.log(p, q, JSON.stringify(others));\nconst { m = 5 } = { m: null } as any;\nconsole.log(m);\nconst swap = { first: 1, second: 2 };\n({ first: swap.second, second: swap.first } = swap) as any;\nconsole.log(swap.first, swap.second);"
  },
  {
    "id": "c371-rt-array-and-object-nesting-json",
    "title": "嵌套结构的 JSON 往返与逐层校验",
    "src": "const data = {\n  users: [\n    { id: 1, tags: [\"a\", \"b\"], meta: { active: true } },\n    { id: 2, tags: [], meta: { active: false, note: null } },\n  ],\n  count: 2,\n};\nconst text = JSON.stringify(data);\nconst back = JSON.parse(text);\nconsole.log(text.length, back.users.length, back.users[0].tags.join(\"|\"));\nconsole.log(back.users[1].meta.note, back.count, JSON.stringify(back.users[0]) === JSON.stringify(data.users[0]));\nconsole.log(Object.keys(back.users[1].meta).join(\",\"), Array.isArray(back.users));"
  },
  {
    "id": "c371-rt-numbers-in-json-and-parse",
    "title": "数字在 JSON 与 parse 上的精度与形态",
    "src": "console.log(JSON.stringify([1, 1.5, -0, 1e21, 1e-7]));\nconsole.log(JSON.parse(\"[1,1.5,1e21,1e-7]\").join(\",\"));\nconsole.log(JSON.parse(\"1e400\"), JSON.parse(\"-1e400\"));\nconsole.log(JSON.stringify(0.1 + 0.2), JSON.parse(String(0.1 + 0.2)));\nconsole.log(JSON.parse(\"9007199254740993\"), 9007199254740993);"
  },
  {
    "id": "c371-rt-set-and-map-conversion",
    "title": "Map / Set 与数组、对象之间的转换",
    "src": "const entries: [string, number][] = [[\"a\", 1], [\"b\", 2]];\nconst m = new Map(entries);\nconsole.log(JSON.stringify([...m]), JSON.stringify(Object.fromEntries(m)));\nconst back = new Map(Object.entries(Object.fromEntries(m)));\nconsole.log(back.size, back.get(\"a\"));\nconst s = new Set([1, 2, 3]);\nconsole.log([...s].map((v) => v * 2).join(\",\"), new Set([...s].filter((v) => v > 1)).size);\nconsole.log(Array.from(s).reduce((a, b) => a + b, 0), new Set(\"aabb\").size);"
  },
  {
    "id": "c371-rt-object-entries-live-vs-snapshot",
    "title": "keys / values / entries 返回的是快照",
    "src": "const o: any = { a: 1, b: 2 };\nconst keys = Object.keys(o);\no.c = 3;\nconsole.log(keys.join(\",\"), Object.keys(o).join(\",\"));\nconst vals = Object.values(o);\no.a = 99;\nconsole.log(vals.join(\",\"), Object.values(o).join(\",\"));\nconst entries = Object.entries(o);\no.d = 4;\nconsole.log(entries.length, Object.entries(o).length);\nconst frozen = Object.freeze({ ...o });\nconsole.log(Object.keys(frozen).join(\",\"), Object.isFrozen(frozen));"
  },
  {
    "id": "c371-rt-void-and-undefined-forms",
    "title": "void / undefined / 缺失返回值的统一口径",
    "src": "function noReturn(): void { }\nfunction returnsUndefined(): undefined { return undefined; }\nconsole.log(noReturn(), returnsUndefined(), void 0, typeof void 0);\nconsole.log(JSON.stringify(noReturn()), String(noReturn()), noReturn() === undefined);\nconst o: any = {};\nconsole.log(o.missing, o[undefined as any], o[\"undefined\"]);\nfunction returnsNothing() { if (false) return 1; }\nconsole.log(returnsNothing(), [1].find((v) => v > 5), [].pop(), [].shift());\nconsole.log((() => {})() === undefined, [1, 2].forEach(() => {}) === undefined);"
  },
  {
    "id": "c371-rt-proxy-free-reflection",
    "title": "不用 Reflect / Proxy 的反射：描述符与原型",
    "src": "const o: any = { a: 1 };\nObject.defineProperty(o, \"b\", { value: 2, enumerable: false, writable: false });\nconsole.log(Object.keys(o).join(\",\"), Object.getOwnPropertyNames(o).join(\",\"));\nconst d = Object.getOwnPropertyDescriptors(o);\nconsole.log(Object.keys(d).join(\",\"), d.b.writable, d.a.enumerable);\nconst copy = Object.defineProperties({}, d);\nconsole.log(copy.a, copy.b, Object.keys(copy).join(\",\"));\nconst clone = Object.create(Object.getPrototypeOf(o), d);\nconsole.log(clone.a, Object.getPrototypeOf(clone) === Object.prototype);"
  },
  {
    "id": "c371-rt-async-generator-and-for-await",
    "title": "异步生成器与 for await 的完整回合",
    "src": "async function* pages(): AsyncGenerator<number[]> {\n  yield [1, 2];\n  await Promise.resolve();\n  yield [3];\n}\nasync function main(): Promise<void> {\n  const all: number[] = [];\n  for await (const page of pages()) {\n    for (const v of page) all.push(v);\n  }\n  console.log(all.join(\",\"));\n  const it = pages();\n  const first = await it.next();\n  console.log(first.done, JSON.stringify(first.value));\n  const second = await it.next();\n  console.log(second.done, JSON.stringify(second.value));\n  const third = await it.next();\n  console.log(third.done, third.value);\n}\nmain();"
  },
  {
    "id": "c371-rt-microtask-and-sync-mixing",
    "title": "同步代码与微任务的交替次序",
    "src": "const order: string[] = [];\norder.push(\"start\");\nPromise.resolve().then(() => order.push(\"p1\"));\norder.push(\"sync1\");\n(async () => { order.push(\"async-start\"); await null; order.push(\"async-after-await\"); })();\nqueueMicrotask(() => order.push(\"qm\"));\norder.push(\"sync2\");\nPromise.resolve().then(() => { order.push(\"p2\"); return Promise.resolve(); }).then(() => order.push(\"p3\"));\nqueueMicrotask(() => console.log(\"microtask-order\", order.join(\",\")));\nconsole.log(\"sync-order\", order.join(\",\"));"
  },
  {
    "id": "c371-rt-tostring-tags-and-inspect",
    "title": "Symbol.toStringTag 与内建对象的标签",
    "src": "class Custom { get [Symbol.toStringTag]() { return \"Custom\"; } }\nconst objs: [string, unknown][] = [[\"obj\", {}], [\"arr\", []], [\"fn\", () => 0], [\"map\", new Map()], [\"set\", new Set()], [\"date\", new Date(0)], [\"err\", new Error(\"e\")], [\"custom\", new Custom()], [\"promise\", Promise.resolve(1)]];\nfor (const [name, v] of objs) console.log(name, Object.prototype.toString.call(v));\nconsole.log(Object.prototype.toString.call(null), Object.prototype.toString.call(undefined));\nconsole.log(String(new Custom()), `${new Custom()}`);"
  },
  {
    "id": "c371-rt-getter-throws-and-cleanup",
    "title": "访问器里抛错时的展开与清理",
    "src": "const log: string[] = [];\nconst o: any = {\n  get bad() { log.push(\"get\"); throw new Error(\"getter\"); },\n  set bad(_v: unknown) { log.push(\"set\"); throw new Error(\"setter\"); },\n};\ntry { console.log(o.bad); } catch (e) { log.push(\"caught:\" + (e as Error).message); }\ntry { o.bad = 1; } catch (e) { log.push(\"caught:\" + (e as Error).message); }\nconst nested: any = { inner: o };\ntry { nested.inner.bad; } catch (e) { log.push(\"deep\"); }\nfunction safe(v: () => unknown): unknown { try { return v(); } catch { return \"fallback\"; } }\nconsole.log(safe(() => o.bad), log.join(\",\"));"
  },
  {
    "id": "c371-rt-large-string-operations",
    "title": "大字符串上的查找 / 切分 / 替换",
    "src": "const text = \"abcd\".repeat(1000);\nconsole.log(text.length, text.indexOf(\"z\"), text.indexOf(\"cd\"), text.lastIndexOf(\"cd\"));\nconsole.log(text.split(\"ab\").length, text.split(\"\").length, text.slice(0, 4));\nconsole.log(text.replace(\"abcd\", \"x\").length, text.startsWith(\"abcd\"), text.endsWith(\"abcd\"));\nconsole.log(text.split(\"abcd\").length, text.includes(\"dcba\"), text.length / 4);\nconsole.log(text.substring(0, 2), text.charAt(3), \"abcd\".repeat(3));"
  },
  {
    "id": "c371-rt-equality-in-collections-and-objects",
    "title": "集合与对象上的判等：引用、键、includes",
    "src": "const a = { v: 1 };\nconst b = { v: 1 };\nconst arr = [a, b];\nconsole.log(arr.indexOf(b) >= 0, arr.includes(a), arr.indexOf({ v: 1 }));\nconst s = new Set([a, b, a]);\nconsole.log(s.size, s.has(a), s.has({ v: 1 }));\nconst m = new Map([[a, \"A\"]]);\nconsole.log(m.get(a), m.get(b), m.get({ v: 1 } as any));\nconsole.log(a === b, a == b, JSON.stringify(a) === JSON.stringify(b));"
  },
  {
    "id": "c371-rt-inheritance-and-override-chain",
    "title": "三层继承：方法解析、super、字段遮蔽",
    "src": "class A { v = \"a\"; who(): string { return \"A:\" + this.v; } }\nclass B extends A { v = \"b\"; who(): string { return \"B(\" + super.who() + \")\"; } }\nclass C extends B { v = \"c\"; who(): string { return \"C(\" + super.who() + \")\"; } }\nconst c = new C();\nconsole.log(c.who(), c.v, new A().who(), new B().who());\nconsole.log(Object.keys(c).join(\",\"), c instanceof A, c instanceof B, Object.getPrototypeOf(C.prototype) === B.prototype);\nconsole.log(A.prototype.who.call(c), B.prototype.who.call(c));"
  },
  {
    "id": "c371-rt-tostring-override-and-json",
    "title": "覆盖 toString / valueOf 对模板与字符串化的影响",
    "src": "class Money {\n  constructor(private amount: number, private unit: string) {}\n  toString(): string { return this.amount.toFixed(2) + this.unit; }\n  valueOf(): number { return this.amount; }\n  toJSON(): { amount: number; unit: string } { return { amount: this.amount, unit: this.unit }; }\n}\nconst m = new Money(12.5, \"USD\");\nconsole.log(String(m), `${m}`, m + 1, m > 10);\nconsole.log(JSON.stringify(m), JSON.stringify({ price: m }));\nconsole.log([m, m].join(\",\"), m.toString().length);",
    "nodeArgs": [
      "--experimental-transform-types"
    ]
  },
  {
    "id": "c371-rt-exception-across-frames",
    "title": "异常跨多层函数帧展开并回到调用者",
    "src": "function level3(): never { throw new Error(\"deep\"); }\nfunction level2(): string { try { return level3(); } catch (e) { throw new Error(\"wrapped(\" + (e as Error).message + \")\"); } }\nfunction level1(): string {\n  const cleanups: string[] = [];\n  try { return level2(); }\n  catch (e) { cleanups.push(\"caught\"); throw e; }\n  finally { cleanups.push(\"finally\"); console.log(cleanups.join(\",\")); }\n}\ntry { level1(); } catch (e) { console.log(\"top\", (e as Error).message); }\nfunction loop(): number {\n  let total = 0;\n  for (let i = 0; i < 5; i++) {\n    try { if (i === 2) throw new Error(\"at \" + i); total += i; }\n    catch { total += 100; }\n    finally { total += 1; }\n  }\n  return total;\n}\nconsole.log(loop());"
  },
  // ============ 第 623 轮加宽：普查 tmp/cand-623b.mjs 收进来的场景 ============
  {
    id: "c623-rt-var-hoisting",
    title: "var 的提升与函数作用域（let 的 TDZ 不谈）",
    src: "\nfunction f() {\n  console.log(typeof v);\n  var v = 1;\n  return v;\n}\nconsole.log(f(), typeof v);\n",
  },
  {
    id: "c623-rt-closure-loop-let",
    title: "闭包捕获循环变量：let 每轮一个绑定",
    src: "\nconst fs: Array<() => number> = [];\nfor (let i = 0; i < 3; i++) fs.push(() => i);\nconsole.log(fs.map((g) => g()).join(\",\"));\nconst gs: Array<() => number> = [];\nfor (var j = 0; j < 3; j++) gs.push(() => j);\nconsole.log(gs.map((g) => g()).join(\",\"));\n",
  },
  {
    id: "c623-rt-mutual-recursion",
    title: "互递归的闭包对与尾调用深度",
    src: "\nfunction isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }\nfunction isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }\nconsole.log(isEven(10), isOdd(10), isEven(101));\n",
  },
  {
    id: "c623-rt-arguments",
    title: "arguments 对象：length / 下标 / 与形参的联动",
    src: "\nfunction f(a: number, b: number) {\n  console.log(arguments.length, arguments[0], arguments[1], arguments[5]);\n  return a + b;\n}\nconsole.log(f(1, 2));\n",
  },
  {
    id: "c623-rt-deep-prototype",
    title: "原型链的深度查找与遮蔽",
    src: "\nconst a = { v: 1, only: \"a\" };\nconst b = Object.create(a);\nconst c = Object.create(b);\nc.v = 3;\nconsole.log(c.v, c.only, b.v);\nconsole.log(Object.getPrototypeOf(Object.getPrototypeOf(c)) === a);\n",
  },
  {
    id: "c623-rt-delete-then-add",
    title: "删除后再加：键序与 hasOwnProperty",
    src: "\nconst o: any = { a: 1, b: 2, c: 3 };\ndelete o.b;\no.b = 9;\nconsole.log(Object.keys(o).join(\",\"), o.b, o.hasOwnProperty(\"b\"));\n",
  },
  {
    id: "c623-rt-string-identity",
    title: "字符串相等按值（拼接 / 切片 / 字面量）",
    src: "\nconst a = \"ab\" + \"c\";\nconst b = \"abc\";\nconst c = \"xabc\".slice(1);\nconsole.log(a === b, b === c, a === c);\nconsole.log([a, b].indexOf(\"abc\"), new Map([[a, 1]]).get(b));\n",
  },
  {
    id: "c623-rt-number-identity",
    title: "数值相等：Int32 与 Float64 两档之间的比较",
    src: "\nconst a = 3;\nconst b = 1.5 * 2;\nconsole.log(a === b, Object.is(a, b), a + b);\nconsole.log([3].includes(1.5 * 2), new Set([3]).has(1.5 * 2));\n",
  },
  {
    id: "c623-rt-catch-non-error",
    title: "抛出非 Error 值并接住（字符串 / 数字 / 对象）",
    src: "\nfunction t(v: any) {\n  try { throw v; } catch (e) { console.log(typeof e, String(e)); }\n}\nt(\"s\");\nt(7);\nt({ a: 1 });\n",
  },
  {
    id: "c623-rt-rethrow-across-frames",
    title: "异常穿过三层调用栈后由最外层接住",
    src: "\nfunction c() { throw new Error(\"deep\"); }\nfunction b() { c(); }\nfunction a() { try { b(); } catch (e: any) { return \"caught:\" + e.message; } }\nconsole.log(a());\n",
  },
  {
    id: "c623-rt-generator-closure",
    title: "生成器持有闭包状态并跨 next 保留",
    src: "\nfunction make() {\n  let n = 0;\n  return function* () { while (true) { n += 1; yield n; } };\n}\nconst it = make()();\nconsole.log(it.next().value, it.next().value, it.next().value);\n",
  },
  {
    id: "c623-rt-array-growth",
    title: "数组的增长与 length 直接赋值",
    src: "\nconst a: number[] = [];\na[3] = 1;\nconsole.log(a.length, a.join(\",\"), 0 in a);\na.length = 2;\nconsole.log(a.length, a.join(\",\"));\na.length = 4;\nconsole.log(a.join(\",\"), a[3]);\n",
  },
  {
    id: "c623-rt-boxed-values",
    title: "包装对象的取值与 typeof",
    src: "\nconst s = new String(\"ab\");\nconst n = new Number(3);\nconst b = new Boolean(false);\nconsole.log(typeof s, typeof n, typeof b, s.length, n + 1);\nconsole.log(s === \"ab\", s == \"ab\", b ? \"t\" : \"f\", Boolean(b));\n",
  },
  {
    id: "c651-rt-symbol-toprimitive",
    title: "Symbol.toPrimitive 各 hint",
    src: "\nclass Money {\n  constructor(v: number) { this.v = v; }\n  [Symbol.toPrimitive](hint: string): any {\n    return hint === \"number\" ? this.v : \"M\" + this.v;\n  }\n  v: number;\n}\nconst m = new Money(7);\nconsole.log(m + 1, `${m}`, +m, String(m), m * 2);\n",
  },
  {
    id: "c651-rt-error-cause-and-aggregate",
    title: "Error.cause 与 AggregateError.errors",
    src: "\nconst inner = new Error(\"inner\");\nconst outer = new Error(\"outer\", { cause: inner });\nconsole.log(outer.message, (outer as any).cause === inner, (outer as any).cause.message);\nconst agg = new AggregateError([new Error(\"a\"), new Error(\"b\")], \"many\");\nconsole.log(agg.errors.length, agg.errors.map((e: any) => e.message).join(\",\"), agg.message);\n",
  },
  {
    id: "c651-rt-getter-setter-symbol-keys",
    title: "符号键的访问器与计算名字段",
    src: "\nconst k = Symbol(\"k\");\nclass Box {\n  private store: number[] = [];\n  get [k](): number { return this.store.length; }\n  set [k](v: number) { this.store.push(v); }\n  [\"m\" + \"1\"](): string { return \"m1\"; }\n}\nconst b = new Box();\nb[k] = 1;\nb[k] = 2;\nconsole.log(b[k], b.m1(), Object.getOwnPropertySymbols(b).length);\n",
  },
  {
    id: "c651-rt-array-with-tosorted-family",
    title: "Array 的 copy 家族与 findLast",
    src: "\nconst xs = [3, 1, 2];\nconsole.log(xs.with(1, 9).join(\",\"), xs.join(\",\"));\nconsole.log(xs.toSorted().join(\",\"), xs.toSorted((a, b) => b - a).join(\",\"), xs.join(\",\"));\nconsole.log(xs.toReversed().join(\",\"), xs.toSpliced(1, 1, 8, 9).join(\",\"));\nconsole.log(xs.findLast((x) => x < 3), xs.findLastIndex((x) => x < 3), xs.at(-1));\n",
  },
  {
    id: "c651-rt-set-operations",
    title: "Set 的集合运算方法",
    src: "\nconst a = new Set([1, 2, 3]);\nconst b = new Set([3, 4]);\nconsole.log([...a.union(b)].join(\",\"), [...a.intersection(b)].join(\",\"), [...a.difference(b)].join(\",\"));\nconsole.log([...a.symmetricDifference(b)].join(\",\"), a.isSubsetOf(b), a.isSupersetOf(b), a.isDisjointFrom(b));\n",
  },
  {
    id: "c651-rt-string-wellformed",
    title: "isWellFormed / toWellFormed",
    src: "\nconst lone = \"a\\uD800b\";\nconsole.log(lone.isWellFormed(), \"abc\".isWellFormed(), lone.toWellFormed().length, \"abc\".toWellFormed());\n",
  },
  {
    id: "c651-rt-promise-with-resolvers",
    title: "Promise.withResolvers",
    src: "\nconst { promise, resolve, reject } = (Promise as any).withResolvers();\npromise.then((v: any) => console.log(\"resolved\", v));\nresolve(5);\nconsole.log(typeof resolve, typeof reject);\n",
  },
  {
    id: "c651-rt-async-iterator-protocol",
    title: "Symbol.asyncIterator 与 for await",
    src: "\nconst bag: any = {\n  [Symbol.asyncIterator]() {\n    let i = 0;\n    return { next: () => Promise.resolve(i < 3 ? { value: i++, done: false } : { value: undefined, done: true }) };\n  },\n};\nasync function main(): Promise<void> {\n  let sum = 0;\n  for await (const v of bag) { sum += v; }\n  console.log(\"sum\", sum);\n}\nmain().then(() => console.log(\"done\"));\n",
  },

  // ===== 第 658 轮收编：普查 pass 的候选（24 条）=====
  {
    id: "k7-rt-generator-delegate-bidirectional",
    title: "生成器：yield* 的双向传值（next(v) 送进被代理生成器、return 提前收尾）",
    src: "\nfunction* inner() {\n  const got = yield \"a\";\n  yield \"inner-saw:\" + got;\n  return \"inner-ret\";\n}\nfunction* outer() {\n  const back = yield* inner();\n  yield \"outer-saw:\" + back;\n}\nconst it = outer();\nconsole.log(JSON.stringify(it.next()));\nconsole.log(JSON.stringify(it.next(\"first\")));\nconsole.log(JSON.stringify(it.next(\"second\")));\nconsole.log(JSON.stringify(it.next()));\n",
  },
  {
    id: "k7-rt-finally-return-interaction",
    title: "finally 与 return 的相互覆盖：finally 里的 return 赢、无 return 时原值保留",
    src: "\nfunction keep() { try { return \"try\"; } finally { console.log(\"f1\"); } }\nfunction override() { try { return \"try\"; } finally { return \"finally\"; } }\nfunction lossy() { try { return \"try\"; } finally { console.log(\"f3\"); return; } }\nconsole.log(keep(), override(), lossy());\n",
  },
  {
    id: "k7-rt-finally-break-continue",
    title: "finally 与 break / continue：循环出口与 finally 的执行顺序",
    src: "\nconst log: string[] = [];\nfor (let i = 0; i < 3; i++) {\n  try { if (i === 1) continue; log.push(\"body\" + i); } finally { log.push(\"fin\" + i); }\n}\nouter: for (let i = 0; i < 3; i++) {\n  try { if (i === 2) break outer; log.push(\"o\" + i); } finally { log.push(\"of\" + i); }\n}\nconsole.log(log.join(\"|\"));\n",
  },
  {
    id: "k7-rt-generator-throw-into-frame",
    title: "生成器：throw() 把异常送进挂起的 yield，被 try 接住后还能继续 yield",
    src: "\nfunction* g() {\n  for (let i = 0; i < 3; i++) {\n    try { yield i; } catch (e) { console.log(\"caught:\" + (e as Error).message); }\n  }\n  return \"done\";\n}\nconst it = g();\nconsole.log(JSON.stringify(it.next()));\nconsole.log(JSON.stringify(it.throw(new Error(\"boom\"))));\nconsole.log(JSON.stringify(it.next()));\nconsole.log(JSON.stringify(it.next()));\n",
  },
  {
    id: "k7-rt-per-iteration-binding",
    title: "闭包与帧：for 的 let 每次迭代一个新绑定（var 只有一个）",
    src: "\nconst fs: Array<() => number> = [];\nfor (let i = 0; i < 3; i++) fs.push(() => i);\nconst gs: Array<() => number> = [];\nfor (var j = 0; j < 3; j++) gs.push(() => j);\nconsole.log(fs.map((f) => f()).join(\",\"));\nconsole.log(gs.map((f) => f()).join(\",\"));\n",
  },
  {
    id: "k7-rt-closure-capture-mutation",
    title: "闭包：捕获的是变量（不是值），两个闭包共享同一格",
    src: "\nfunction pair() {\n  let n = 0;\n  return { inc: () => ++n, get: () => n };\n}\nconst p = pair();\nconst q = pair();\nconsole.log(p.inc(), p.inc(), p.get(), q.get());\n",
  },
  {
    id: "k7-rt-symbol-toprimitive-three-hints",
    title: "Symbol.toPrimitive：hint 取 default / number / string 三条路",
    src: "\nconst o = {\n  [Symbol.toPrimitive](hint: string) { return hint === \"number\" ? 1 : hint === \"string\" ? \"s\" : \"d\"; },\n};\nconsole.log(o + \"\", +o, `${o}`, o == 1, String(o));\n",
  },
  {
    id: "k7-rt-prototype-chain-instanceof",
    title: "原型链：三层继承上的 instanceof 与 isPrototypeOf，改原型后判定跟着变",
    src: "\nclass A {} class B extends A {} class C extends B {}\nconst c = new C();\nconsole.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);\nconsole.log(A.prototype.isPrototypeOf(c), C.prototype.isPrototypeOf(new B()));\nconsole.log(Object.getPrototypeOf(C.prototype) === B.prototype);\n",
  },
  {
    id: "k7-rt-null-prototype-object",
    title: "没有原型的对象：Object.create(null) 没有 toString，得靠 Object.prototype 借",
    src: "\nconst bare = Object.create(null);\nconsole.log(Object.getPrototypeOf(bare), \"toString\" in bare, typeof bare.toString);\nbare.k = 1;\nconsole.log(Object.prototype.hasOwnProperty.call(bare, \"k\"), Object.keys(bare).join(\",\"));\nconsole.log(Object.prototype.toString.call(bare));\n",
  },
  {
    id: "k7-rt-descriptor-accessor-flags",
    title: "属性描述符：访问器 + enumerable/configurable 的默认值都是 false",
    src: "\nconst o: any = {};\nlet hidden = 0;\nObject.defineProperty(o, \"v\", { get() { return hidden; }, set(n) { hidden = n; } });\no.v = 7;\nconst d = Object.getOwnPropertyDescriptor(o, \"v\");\nconsole.log(o.v, d.enumerable, d.configurable, d.writable, Object.keys(o).length);\nconsole.log(JSON.stringify(Object.keys(o)));\n",
  },
  {
    id: "k7-rt-shared-closure-counter",
    title: "值模型：对象标识（同一个对象两份引用），原始值按值比较",
    src: "\nconst a = { n: 1 };\nconst b = a;\nconst c = { n: 1 };\nb.n = 2;\nconsole.log(a.n, a === b, a === c, JSON.stringify(a) === JSON.stringify(c));\nconsole.log(typeof null, [] === [], null === null, NaN === NaN, Object.is(NaN, NaN));\n",
  },
  {
    id: "k7-rt-optional-chain-shells",
    title: "可选链的壳：?.() 调用、?.[] 索引、delete 与赋值里不许用（语法层）",
    src: "\nconst o: any = { f: (n: number) => n + 1, arr: [1, 2] };\nconst n1: any = null;\nconsole.log(o?.f(1), n1?.f(1), o?.arr?.[0], n1?.arr?.[0]);\nconsole.log(n1?.[\"x\"]?.y ?? \"fallback\", o?.missing?.deep?.deeper);\ndelete o?.arr;\nconsole.log(Array.isArray(o.arr), o.arr === undefined);\n",
  },
  {
    id: "k7-rt-exception-through-callers",
    title: "异常穿帧：三层调用里抛出，栈中途的 finally 依次跑",
    src: "\nfunction a() { try { b(); } finally { console.log(\"fin-a\"); } }\nfunction b() { try { c(); } finally { console.log(\"fin-b\"); } }\nfunction c() { throw new RangeError(\"deep\"); }\ntry { a(); } catch (e) { console.log((e as Error).name, (e as Error).message); }\n",
  },
  {
    id: "k7-rt-switch-fallthrough-and-default",
    title: "switch：穿透、default 位置不影响语义、严格相等匹配",
    src: "\nfunction f(n: number): string {\n  const out: string[] = [];\n  switch (n) {\n    case 1: out.push(\"one\");\n    case 2: out.push(\"two\"); break;\n    default: out.push(\"def\");\n    case 3: out.push(\"three\");\n  }\n  return out.join(\"/\");\n}\nconsole.log(f(1), f(2), f(3), f(9), f(0));\n",
  },
  {
    id: "k7-rt-default-param-evaluation",
    title: "默认参数：表达式每次调用求值、靠 arguments.length 区分「没传」与「传 undefined」",
    src: "\nlet calls = 0;\nfunction f(a: number, b: number = ++calls): string {\n  return a + \":\" + b + \":\" + arguments.length;\n}\nconsole.log(f(1), f(1, 5), f(1, undefined), calls);\n",
  },
  {
    id: "k7-rt-this-binding-forms",
    title: "this 绑定：方法调用 / 裸调用 / call / 箭头函数取外层",
    src: "\nconst o = { n: \"o\", get() { return this === undefined ? \"undef\" : (this as any).n; } };\nconst bare = o.get;\nconsole.log(o.get(), bare(), o.get.call({ n: \"x\" }));\nconst arrow = () => (this === undefined ? \"top-undef\" : \"top\");\nconsole.log(typeof arrow());\n",
  },
  {
    id: "k7-rt-array-holes-and-length",
    title: "数组的形状：delete 留洞、length 写大留洞、写小截断，遍历跳过洞",
    src: "\nconst xs: any[] = [1, 2, 3, 4];\ndelete xs[1];\nconsole.log(xs.length, 1 in xs, xs.join(\",\"), JSON.stringify(xs));\nxs.length = 2;\nconsole.log(xs.length, xs.join(\",\"));\nxs.length = 5;\nconsole.log(xs.length, xs[4], Object.keys(xs).join(\",\"));\n",
  },
  {
    id: "k7-rt-nested-finally-order",
    title: "嵌套 try：内层 return 时两层 finally 的先后，以及抛错时 finally 的先后",
    src: "\nfunction f(): string {\n  const log: string[] = [];\n  try {\n    try { return log.push(\"inner\") && \"ret\"; } finally { log.push(\"fin-inner\"); }\n  } finally { log.push(\"fin-outer\"); }\n}\nconsole.log(f());\ntry {\n  try { throw new Error(\"e\"); } finally { console.log(\"A\"); }\n} catch { console.log(\"B\"); } finally { console.log(\"C\"); }\n",
  },
  {
    id: "k7-rt-arraylike-and-length",
    title: "类数组：靠 length + 下标就能被 Array.from 收，arguments 也是这一类",
    src: "\nconst like = { 0: \"a\", 1: \"b\", length: 2 };\nconsole.log(Array.from(like).join(\",\"), Array.prototype.slice.call(like).join(\",\"));\nfunction f() { return Array.from(arguments).join(\"+\"); }\nconsole.log(f(1, 2, 3), f.length);\n",
  },
  {
    id: "k7-rt-object-key-order",
    title: "键序：整数键在前升序、字符串键按插入、Symbol 不进 Object.keys",
    src: "\nconst o: any = {};\no.b = 1; o[\"2\"] = 2; o.a = 3; o[\"1\"] = 4;\no[Symbol(\"s\")] = 5;\nconsole.log(Object.keys(o).join(\",\"));\nconsole.log(Object.getOwnPropertyNames(o).join(\",\"));\nconsole.log(Object.getOwnPropertySymbols(o).length);\n",
  },
  {
    id: "k7-rt-coercion-plus-and-compare",
    title: "值模型：+ 的字符串优先、关系比较走数值、== 的转换表",
    src: "\nconsole.log(1 + \"2\", \"3\" * \"2\", [] + {}, [] + [], [1] + 1, null + 1, undefined + 1);\nconsole.log(\"10\" < \"9\", \"10\" < 9, null == undefined, null === undefined, \"\" == 0, [] == false);\n",
  },
  {
    id: "k7-rt-conditional-expr-shortcircuit",
    title: "短路求值：&& / || / ?? 的返回值与副作用是否发生",
    src: "\nlet n = 0;\nconst bump = () => { n++; return \"bumped\"; };\nconsole.log(0 && bump(), 1 || bump(), undefined ?? bump(), n);\nconsole.log(null ?? \"d\", 0 ?? \"d\", \"\" || \"e\", \"0\" && \"f\");\n",
  },
  {
    id: "k7-rt-generator-object-identity",
    title: "生成器对象：迭代器 === 可迭代物、Symbol.iterator 返回自己、done 之后不再变",
    src: "\nfunction* g() { yield 1; }\nconst it = g();\nconsole.log(typeof it.next, it[Symbol.iterator]() === it);\nconsole.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));\nconsole.log([...g()].join(\",\"), JSON.stringify([...g()]));\n",
  },
  {
    id: "k7-rt-labeled-break-block",
    title: "带标签的块：label 挂在块上，break label 跳出块继续往下",
    src: "\nconst log: string[] = [];\nblk: {\n  log.push(\"in\");\n  if (log.length === 1) break blk;\n  log.push(\"unreachable\");\n}\nlog.push(\"after\");\nconsole.log(log.join(\"|\"));\n",
  },

  // ===== 第 662 轮：执行侧加宽矩阵（普查 pass 的 17 条）=====
  {
    id: "k7-rt-sort-getter-access-order",
    title: "排序比较器读访问器的次数与顺序",
    src: "\nlet reads = 0;\nconst items = [\n  { get v() { reads++; return 3; }, n: \"a\" },\n  { get v() { reads++; return 1; }, n: \"b\" },\n  { get v() { reads++; return 2; }, n: \"c\" },\n];\nconst order = items.slice().sort((x, y) => x.v - y.v).map((o) => o.n);\nconsole.log(order.join(\",\"));\nconsole.log(\"sorted\", items.length);\n",
  },
  {
    id: "k7-rt-map-delete-current-entry",
    title: "遍历 Map 时删掉当前这一项（后续项照旧走完）",
    src: "\nconst m = new Map<string, number>([[\"a\", 1], [\"b\", 2], [\"c\", 3], [\"d\", 4]]);\nconst seen: string[] = [];\nfor (const [k, v] of m) {\n  seen.push(k + v);\n  if (v % 2 === 0) m.delete(k);\n}\nconsole.log(seen.join(\",\"), m.size, [...m.keys()].join(\",\"));\n",
  },
  {
    id: "k7-rt-set-foreach-third-arg",
    title: "Set.forEach 的第三个实参就是那个集合本身",
    src: "\nconst s = new Set<number>([1, 2, 3]);\nconst out: string[] = [];\ns.forEach(function (value, key, owner) {\n  out.push(value + \"/\" + key + \"/\" + (owner === s));\n});\nconsole.log(out.join(\" \"));\n",
  },
  {
    id: "k7-rt-object-is-and-negative-zero",
    title: "Object.is / -0 / NaN 的分辨",
    src: "\nconsole.log(Object.is(NaN, NaN), NaN === NaN);\nconsole.log(Object.is(0, -0), 0 === -0);\nconsole.log(1 / -0 === -Infinity, String(-0));\nconst box = { z: -0 };\nconsole.log(Object.is(box.z, -0), box.z === 0);\n",
  },
  {
    id: "k7-rt-json-tojson-undefined-slots",
    title: "toJSON 给出 undefined：数组里留 null、对象里整格抹掉",
    src: "\nconst item = { keep: 1, drop: 2, toJSON() { return undefined; } };\nconsole.log(JSON.stringify([item, { keep: 3 }]));\nconsole.log(JSON.stringify({ a: item, b: { keep: 4 } }));\nconsole.log(JSON.stringify({ a: undefined, b: () => 1, c: 5 }));\n",
  },
  {
    id: "k7-rt-loop-capture-in-microtasks",
    title: "循环里的 let 捕获 + 微任务顺序",
    src: "\nconst out: number[] = [];\nfor (let i = 0; i < 3; i++) {\n  Promise.resolve(i).then((v) => out.push(v));\n}\nconst vars: number[] = [];\nfor (var j = 0; j < 3; j++) {\n  Promise.resolve().then(() => vars.push(j));\n}\nPromise.resolve().then(() => {\n  console.log(out.join(\",\"), vars.join(\",\"));\n});\n",
  },
  {
    id: "k7-rt-generator-return-in-forof-finally",
    title: "for..of 里 return 提前退出：finally 照跑、迭代器被关闭",
    src: "\nconst log: string[] = [];\nfunction* gen() {\n  try {\n    yield 1;\n    yield 2;\n  } finally {\n    log.push(\"closed\");\n  }\n}\nfunction take() {\n  for (const v of gen()) {\n    log.push(\"v\" + v);\n    if (v === 1) return \"early\";\n  }\n  return \"full\";\n}\nconsole.log(take(), log.join(\",\"));\n",
  },
  {
    id: "k7-rt-labeled-continue-nested-forof",
    title: "带标签的 continue 跨两层 for..of",
    src: "\nconst pairs: string[] = [];\nouter: for (const a of [1, 2, 3]) {\n  for (const b of [1, 2, 3]) {\n    if (b === 2) continue outer;\n    if (a === 2) break outer;\n    pairs.push(a + \":\" + b);\n  }\n}\nconsole.log(pairs.join(\" \"));\n",
  },
  {
    id: "k7-rt-symbol-hasinstance-plain-object",
    title: "自定义 Symbol.hasInstance（普通对象上）",
    src: "\nclass Even {\n  static [Symbol.hasInstance](value: any): boolean {\n    return typeof value === \"number\" && value % 2 === 0;\n  }\n}\nconsole.log(4 instanceof Even, 5 instanceof Even, \"4\" instanceof Even);\nconsole.log([2, 3, 4].filter((n) => n instanceof Even).join(\",\"));\n",
  },
  {
    id: "k7-rt-symbol-toprimitive-in-template",
    title: "Symbol.toPrimitive 决定模板串与加法的结果",
    src: "\nconst money = {\n  amount: 7,\n  [Symbol.toPrimitive](hint: string): string | number {\n    return hint === \"string\" ? this.amount + \" yuan\" : this.amount;\n  },\n};\nconsole.log(`${money}`, \"cost \" + money, money + 1);\n",
  },
  {
    id: "k7-rt-array-from-holes-and-mapper",
    title: "Array.from 对稀疏数组 / 类数组 / 映射函数",
    src: "\nconst sparse = [1, , 3];\nconsole.log(Array.from(sparse, (v, i) => i + \":\" + String(v)).join(\"|\"));\nconsole.log(Array.from({ length: 3 }, (_, i) => i * 2).join(\",\"));\nconsole.log(Array.from(\"abc\", (c) => c.toUpperCase()).join(\"\"));\n",
  },
  {
    id: "k7-rt-switch-fallthrough-scoped-block",
    title: "switch 贯穿 + 每段一个块作用域",
    src: "\nfunction kind(n: number): string {\n  let out = \"\";\n  switch (n) {\n    case 0: {\n      const tag = \"zero\";\n      out += tag + \";\";\n    }\n    case 1: {\n      const tag = \"one\";\n      out += tag + \";\";\n    }\n    case 2:\n      out += \"two;\";\n      break;\n    default:\n      out += \"other;\";\n  }\n  return out;\n}\nfor (const n of [0, 1, 2, 5]) console.log(kind(n));\n",
  },
  {
    id: "k7-rt-comma-void-side-effects",
    title: "逗号运算符与 void 的求值顺序",
    src: "\nlet trace: string[] = [];\nconst bump = (tag: string, value: number): number => {\n  trace.push(tag);\n  return value;\n};\nconst total = (bump(\"a\", 1), bump(\"b\", 2), bump(\"c\", 3));\nconsole.log(total, trace.join(\"\"));\nconsole.log(void bump(\"d\", 4), trace.join(\"\"));\n",
  },
  {
    id: "k7-rt-promise-adoption-chain",
    title: "then 回调返回承诺：结果跟着内层走",
    src: "\nconst chain = Promise.resolve(1)\n  .then((v) => Promise.resolve(v + 1))\n  .then((v) => ({ v }))\n  .then((o) => o.v * 10)\n  .then((v) => { if (v !== 20) throw new Error(\"bad \" + v); return \"ok\"; });\nchain.then((v) => console.log(v), (e) => console.log(\"err\", String(e)));\nPromise.all([Promise.resolve(\"x\"), 1, \"y\"]).then((all) => console.log(all.join(\"|\")));\n",
  },
  {
    id: "k7-rt-optional-call-chain-mixed",
    title: "可选调用 / 可选下标 / 空值合并混在一起",
    src: "\ntype Box = { f?: (n: number) => number; list?: Array<number>; deep?: { g?: () => string } };\nconst a: Box = { f: (n) => n * 2, list: [5, 6] };\nconst b: Box = {};\nconsole.log(a.f?.(3) ?? -1, b.f?.(3) ?? -1);\nconsole.log(a.list?.[1] ?? -1, b.list?.[1] ?? -1);\nconsole.log(b.deep?.g?.() ?? \"none\", a.deep?.g?.() ?? \"none\");\nconsole.log(a.list?.length ?? 0, (b.list ?? []).length);\n",
  },
  {
    id: "k7-rt-class-accessor-super-chain",
    title: "派生类里 get / set 与 super 的两向配合",
    src: "\nclass Base {\n  protected raw = 1;\n  get value(): number { return this.raw; }\n  set value(next: number) { this.raw = next; }\n}\nclass Doubler extends Base {\n  get value(): number { return super.value * 2; }\n  set value(next: number) { super.value = next; }\n}\nconst d = new Doubler();\nconsole.log(d.value);\nd.value = 5;\nconsole.log(d.value);\nconst target = { get v() { return \"g\"; }, set v(x: string) { console.log(\"set\", x); } };\ntarget.v = \"z\";\nconsole.log(target.v);\n",
  },
  {
    id: "k7-rt-spread-evaluates-getters-once",
    title: "对象展开与解构各读一次访问器",
    src: "\nlet reads = 0;\nconst src: any = { get a() { reads++; return \"A\"; }, b: \"B\" };\nconst copy = { ...src };\nconst { a, ...rest } = src;\nconsole.log(copy.a, rest.b, a, reads);\n",
  },

  // ---- 第 665 轮：场景加宽（一条 = 一个真跑的 .ts，裁判是真 node）----
  {
    id: "k8-rt-gen-delegate-return",
    title: "yield* 的返回值与 finally 的执行顺序",
    src: "\nfunction* inner() {\n  try { yield 1; return \"r\"; } finally { console.log(\"inner-finally\"); }\n}\nfunction* outer() {\n  const got = yield* inner();\n  console.log(\"got\", got);\n  yield 2;\n}\nfor (const v of outer()) console.log(\"v\", v);\n",
  },
  {
    id: "k8-rt-tagged-template-raw",
    title: "标签模板的 cooked 与 raw（含换行与转义）",
    src: "\nfunction tag(strings, ...values) {\n  console.log(JSON.stringify(strings.raw), JSON.stringify(strings), values);\n  return strings.length;\n}\nconsole.log(tag`a\\nb${1}c\\td`);\n",
  },
  {
    id: "k8-rt-destructure-holes-defaults",
    title: "数组解构的洞、默认值、剩余与嵌套",
    src: "\nconst [a, , b = 9, ...rest] = [1, 2, undefined, 4, 5];\nconst [[c], { d: { e } = {} }] = [[3], { d: { e: 7 } }];\nconsole.log(a, b, rest, c, e);\n",
  },
  {
    id: "k8-rt-labeled-continue-nested",
    title: "带标签的 continue 跳到外层循环的下一轮",
    src: "\nouter: for (let i = 0; i < 3; i++) {\n  for (let j = 0; j < 3; j++) {\n    if (j === 1) continue outer;\n    console.log(i, j);\n  }\n  console.log(\"never\");\n}\n",
  },
  {
    id: "k8-rt-string-iterator-surrogate",
    title: "字符串迭代按码点、length 按码元",
    src: "\nconst s = \"a\\u{1F600}b\";\nconsole.log(s.length, [...s].length, [...s].map((c) => c.length).join(\",\"));\nconsole.log(Array.from(s).join(\"|\"));\n",
  },
  {
    id: "k8-rt-getter-once-per-key",
    title: "对象展开对每个键只取一次值（含访问器）",
    src: "\nlet reads = 0;\nconst src = { get a() { reads++; return reads; }, b: 2 };\nconst copy = { ...src, ...src };\nconsole.log(copy.a, copy.b, reads);\n",
  },
  {
    id: "k8-rt-async-gen-await-sequence",
    title: "异步生成器里 for await 的顺序与 return",
    src: "\nasync function* gen() {\n  for (let i = 0; i < 3; i++) {\n    await Promise.resolve(i);\n    yield i;\n  }\n  return \"done\";\n}\nasync function main() {\n  for await (const v of gen()) console.log(v);\n  const it = gen();\n  console.log((await it.next()).value, (await it.return(\"x\")).value);\n}\nmain();\n",
  },
  {
    id: "k8-rt-switch-fallthrough-and-return",
    title: "switch 的穿透、返回与 default 位置",
    src: "\nfunction f(x) {\n  switch (x) {\n    case 1:\n    case 2:\n      return \"low\";\n    default:\n      return \"other\";\n    case 3:\n      return \"three\";\n  }\n}\nconsole.log(f(1), f(2), f(3), f(9));\n",
  },

  // ---- 第 666 轮：场景加宽（一条 = 一个真跑的 .ts，裁判是真 node）----
  {
    id: "k9-rt-class-accessors",
    title: "类访问器：getter/setter 配对、静态访问器、只读缓存",
    src: "\nclass Temp {\n  private c = 0;\n  get celsius(): number { return this.c; }\n  set celsius(v: number) { this.c = v; }\n  get fahrenheit(): number { return this.c * 9 / 5 + 32; }\n  static get label(): string { return \"temp\"; }\n}\nconst t = new Temp();\nt.celsius = 25;\nconsole.log(t.celsius, t.fahrenheit, Temp.label);\nconst d = Object.getOwnPropertyDescriptor(Temp.prototype, \"celsius\");\nconsole.log(typeof d.get, typeof d.set);\n",
  },
  {
    id: "k9-rt-class-static-block",
    title: "类静态块：初始化顺序与 this",
    src: "\nclass Registry {\n  static items: string[] = [];\n  static count: number;\n  static {\n    Registry.count = 0;\n    console.log(\"static block\");\n  }\n  static add(x: string) { Registry.items.push(x); }\n}\nRegistry.add(\"a\");\nconsole.log(Registry.items.join(\",\"), Registry.count);\n",
  },
  {
    id: "k9-rt-private-brand-check",
    title: "私有字段：品牌检查、同名不同类互不可见",
    src: "\nclass Box {\n  #v: number;\n  constructor(v: number) { this.#v = v; }\n  static peek(o: unknown): number {\n    return o instanceof Box ? o.#v : -1;\n  }\n}\nclass Other { #v = 9; }\nconsole.log(Box.peek(new Box(5)), Box.peek(new Other()));\n",
  },
  {
    id: "k9-rt-iterator-protocol",
    title: "自定义同步迭代器 + 展开 + for-of + 解构",
    src: "\nclass Range {\n  lo: number;\n  hi: number;\n  constructor(lo: number, hi: number) { this.lo = lo; this.hi = hi; }\n  [Symbol.iterator]() {\n    let i = this.lo;\n    const hi = this.hi;\n    return {\n      next() { return i <= hi ? { value: i++, done: false } : { value: 0, done: true }; },\n    };\n  }\n}\nconst r = new Range(1, 4);\nconsole.log([...r].join(\"-\"));\nfor (const v of r) console.log(\"of\", v);\nconst [a, b] = r;\nconsole.log(a, b);\n",
  },
  {
    id: "k9-rt-iterator-return-on-break",
    title: "for-of 里 break 会调迭代器的 return",
    src: "\nlet closed = false;\nconst it = {\n  [Symbol.iterator]() {\n    let i = 0;\n    return {\n      next() { return { value: i++, done: i > 5 }; },\n      return() { closed = true; return { value: undefined, done: true }; },\n    };\n  },\n};\nfor (const v of it) { if (v === 2) break; }\nconsole.log(\"closed\", closed);\n",
  },
  {
    id: "k9-rt-generator-throw-catch",
    title: "生成器：throw 注入到 yield 处、finally 收尾、return 值",
    src: "\nfunction* g() {\n  try {\n    yield 1;\n    yield 2;\n  } catch (e) {\n    console.log(\"caught\", e);\n    yield 3;\n  } finally {\n    console.log(\"finally\");\n  }\n  return \"end\";\n}\nconst it = g();\nconsole.log(it.next());\nconsole.log(it.throw(\"boom\"));\nconsole.log(it.next());\nconsole.log(it.next());\n",
  },
  {
    id: "k9-rt-spread-call-and-new",
    title: "展开实参 / new / 数组字面量 / 对象字面量",
    src: "\nfunction f(a: number, b: number, c: number) { return a + b + c; }\nconsole.log(f(...[1, 2, 3]));\nconsole.log(f(1, ...[2, 3]));\nclass P {\n  x: number;\n  y: number;\n  constructor(x: number, y: number) { this.x = x; this.y = y; }\n}\nconst p = new P(...[4, 5]);\nconsole.log(p.x, p.y, [...\"abc\"].join(\"|\"));\nconst o = { a: 1, ...{ b: 2 }, c: 3 };\nconsole.log(JSON.stringify(o));\n",
  },
  {
    id: "k9-rt-logical-assign-members",
    title: "逻辑赋值 / 复合赋值的左值只求值一次",
    src: "\nlet calls = 0;\nconst o = { n: 1, s: \"a\" };\nfunction k() { calls += 1; return \"n\"; }\no[k()] ??= 5;\no[k()] &&= 7;\no[k()] ||= 9;\nconsole.log(o.n, calls);\nlet i = 0;\nconst arr = [10, 20];\narr[i++] += 1;\nconsole.log(arr.join(\",\"), i);\n",
  },
  {
    id: "k9-rt-optional-chain-assign-guard",
    title: "可选链的短路口径：成员 / 调用 / 下标 / 与 ?? 混用",
    src: "\nconst o: any = { a: { b: () => 1 } };\nconsole.log(o?.a?.b?.(), o?.x?.y?.(), o?.[\"a\"]?.[\"b\"]?.());\nconst n: any = null;\nconsole.log(n?.a ?? \"fallback\", n?.[0] ?? \"idx\", n?.() ?? \"call\");\nlet hits = 0;\nconst side = () => { hits += 1; return { v: 1 }; };\nconsole.log(side()?.v, hits);\n",
  },
  {
    id: "k9-rt-new-target",
    title: "new.target：直接调用与 new 调用",
    src: "\nfunction F(this: any) {\n  if (new.target === undefined) { console.log(\"plain\"); return; }\n  console.log(\"new\", new.target.name);\n}\nF();\nnew (F as any)();\n",
  },
  {
    id: "k9-rt-error-cause-and-instanceof",
    title: "Error 家族：子类、cause、instanceof 链",
    src: "\nclass AppError extends Error {\n  code: number;\n  constructor(message: string, code: number) { super(message); this.name = \"AppError\"; this.code = code; }\n}\nconst e = new AppError(\"bad\", 42);\nconsole.log(e instanceof AppError, e instanceof Error, e.message, e.code, e.name);\nconsole.log(String(e));\nconst wrapped = new Error(\"outer\", { cause: e });\nconsole.log(wrapped.message, (wrapped as any).cause === e);\n",
  },
  {
    id: "k9-rt-async-return-await-order",
    title: "async：返回 thenable、await 顺序、微任务与同步的交替",
    src: "\nconst log: string[] = [];\nasync function a() { log.push(\"a1\"); await null; log.push(\"a2\"); return \"A\"; }\nasync function b() { log.push(\"b1\"); const r = await a(); log.push(\"b2:\" + r); return \"B\"; }\nb().then((v) => { log.push(\"then:\" + v); console.log(log.join(\" \")); });\nlog.push(\"sync\");\n",
  },
  {
    id: "k9-rt-async-generator-basic",
    title: "async 生成器：for await 收完再迭代",
    src: "\nasync function* gen() { yield 1; yield 2; yield 3; }\nasync function main() {\n  let sum = 0;\n  for await (const v of gen()) sum += v;\n  console.log(\"sum\", sum);\n  const all = [];\n  for await (const v of gen()) all.push(v * 2);\n  console.log(all.join(\",\"));\n}\nmain();\n",
  },
  {
    id: "k9-rt-label-block-break",
    title: "带标签的块与 break：跳出嵌套块",
    src: "\nouter: {\n  console.log(\"in\");\n  inner: {\n    console.log(\"inner\");\n    break outer;\n  }\n  console.log(\"unreachable\");\n}\nconsole.log(\"done\");\n",
  },
  {
    id: "k9-rt-comma-and-void",
    title: "逗号表达式、void、delete 的求值顺序",
    src: "\nlet order: string[] = [];\nfunction t(x: string, v: number) { order.push(x); return v; }\nconst r = (t(\"a\", 1), t(\"b\", 2), t(\"c\", 3));\nconsole.log(r, order.join(\"\"));\nconst o: any = { p: 1 };\nconsole.log(delete o.p, o.p, void 0);\n",
  },
  {
    id: "k9-rt-getter-on-literal-and-super",
    title: "对象字面量访问器与 super 成员访问",
    src: "\nconst base = { greet() { return \"base\"; } };\nconst obj = {\n  __proto__: base,\n  greet() { return \"derived+\" + super.greet(); },\n};\nconsole.log(obj.greet());\nconst withAccessor = {\n  _v: 1,\n  get v() { return this._v * 10; },\n  set v(x: number) { this._v = x; },\n};\nwithAccessor.v = 3;\nconsole.log(withAccessor.v, Object.keys(withAccessor).join(\",\"));\n",
  },
  {
    id: "k9-rt-array-from-and-of",
    title: "Array.from（含映射函数与类数组）/ Array.of",
    src: "\nconsole.log(Array.from({ length: 3 }, (_: unknown, i: number) => i * 2).join(\",\"));\nconsole.log(Array.from(new Set([1, 2, 2, 3])).join(\",\"));\nconsole.log(Array.from(\"abc\").join(\"-\"));\nconsole.log(Array.of(1, \"a\", true).length);\n",
  },
  {
    id: "k9-rt-string-iteration-codepoints",
    title: "字符串按码点迭代与代理对",
    src: "\nconst s = \"a\\u{1F600}b\";\nconsole.log(s.length, [...s].length);\nconsole.log([...s].map((c) => c.codePointAt(0)!.toString(16)).join(\",\"));\nconsole.log(s.at(-1), s.at(0));\n",
  },
  {
    id: "k9-rt-switch-strict-equality",
    title: "switch 的严格相等与 fallthrough、块级 case",
    src: "\nfunction kind(v: any) {\n  switch (v) {\n    case \"1\": return \"string\";\n    case 1: return \"number\";\n    case true: return \"bool\";\n    case null: return \"null\";\n    default: return \"other\";\n  }\n}\nconsole.log(kind(\"1\"), kind(1), kind(true), kind(null), kind(undefined));\nlet acc = \"\";\nswitch (2) { case 1: acc += \"a\"; case 2: acc += \"b\"; case 3: acc += \"c\"; break; case 4: acc += \"d\"; }\nconsole.log(acc);\n",
  },
];
