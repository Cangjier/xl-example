// 覆盖矩阵：**标准库（builtins）** 这一层。
//
// 一条 = 一个内建成员 / 一种标准形状；`src` 交给 `node` 与 `tsrun` 各跑一遍。
// 名单的来处是**真的装了什么**（`typescript-exec/builtins/*.xl.md` 里那几张
// `entries` 表）——所以「矩阵里有、装的那张表里没有」这一格就是**缺口**，
// 反过来「装了却没考」这一格就是**覆盖不足**。两样都要看得见。

export const stdlibCases = [
  // ============ Array ============
  {
    id: "array-push-pop",
    title: "Array.push / pop：返回长度与弹出的值",
    src: `
const xs = [1, 2];
console.log(xs.push(3, 4), xs.join(","));
console.log(xs.pop(), xs.join(","), [].pop());
`,
  },
  {
    id: "array-shift-unshift",
    title: "Array.shift / unshift",
    src: `
const xs = [2, 3];
console.log(xs.shift(), xs.join(","));
console.log(xs.unshift(0, 1), xs.join(","));
console.log([].shift());
`,
  },
  {
    id: "array-join",
    title: "Array.join：默认逗号、空串分隔、null/undefined 变空",
    src: `
const xs: any[] = [1, "a", null, undefined, true];
console.log(xs.join(), xs.join("-"), xs.join(""));
console.log([].join(","), [1].join(","), [1, [2, 3]].join("|"));
`,
  },
  {
    id: "array-indexOf-includes",
    title: "Array.indexOf / includes（含 NaN 与 fromIndex）",
    src: `
const xs = [1, 2, 3, 2];
console.log(xs.indexOf(2), xs.indexOf(2, 2), xs.indexOf(9), xs.includes(3), xs.includes(9));
console.log([NaN].indexOf(NaN), [NaN].includes(NaN), ["a"].includes("a"));
`,
  },
  {
    id: "array-slice-splice",
    title: "Array.slice（不改原数组）/ splice（改）",
    src: `
const xs = [0, 1, 2, 3, 4];
console.log(xs.slice(1, 3).join(","), xs.slice(-2).join(","), xs.slice().join(","), xs.join(","));
console.log(xs.splice(1, 2, "a").join(","), xs.join(","));
console.log([1, 2, 3].splice(-1).join(","));
`,
  },
  {
    id: "array-map-filter",
    title: "Array.map / filter：返回新数组、回调拿 (值, 下标, 数组)",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.map((v) => v * 2).join(","));
console.log(xs.filter((v) => v % 2 === 0).join(","));
console.log(xs.map((v, i, all) => v + ":" + i + "/" + all.length).join(" "));
console.log([].map((v: any) => v).length, xs.join(","));
`,
  },
  {
    id: "array-forEach",
    title: "Array.forEach：顺序、下标、返回值是 undefined",
    src: `
const xs = ["a", "b"];
const seen: string[] = [];
console.log(xs.forEach((v, i) => { seen.push(i + v); }));
console.log(seen.join(","));
`,
  },
  {
    id: "array-find-family",
    title: "Array.find / findIndex / some / every（谓词族）",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.find((v) => v > 2), xs.find((v) => v > 9));
console.log(xs.findIndex((v) => v > 2), xs.findIndex((v) => v > 9));
console.log(xs.some((v) => v > 3), xs.every((v) => v > 0), [].every((v: any) => false));
`,
  },
  {
    id: "array-reduce",
    title: "Array.reduce：带初值 / 不带初值 / 空数组那一档",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.reduce((a, b) => a + b, 0), xs.reduce((a, b) => a + b));
console.log(["a", "b"].reduce((a, b) => a + b, ""));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log("empty:", e.name); }
`,
  },
  {
    id: "array-sort",
    title: "Array.sort：默认按文本、给了比较器按比较器（且返回原数组）",
    src: `
const xs = [10, 9, 1, 2];
console.log(xs.slice().sort().join(","));
console.log(xs.slice().sort((a, b) => a - b).join(","));
console.log(xs.slice().sort((a, b) => b - a).join(","));
const words = ["pear", "apple", "fig"];
console.log(words.sort().join(","), words.join(","));
`,
  },
  {
    id: "array-reverse-concat",
    title: "Array.reverse / concat（含非数组实参）",
    src: `
const xs = [1, 2, 3];
console.log(xs.reverse().join(","), xs.join(","));
console.log([1].concat([2, 3], 4).join(","), [].concat().length);
console.log([1].concat("ab" as any).join(","));
`,
  },
  {
    id: "array-at-flat-fill",
    title: "Array.at / flat / fill（含负下标与深度）",
    src: `
console.log([1, 2, 3].at(0), [1, 2, 3].at(-1), [1, 2, 3].at(9));
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, 2, 3, 4].fill(0).join(","), [1, 2, 3, 4].fill(9, 1, 3).join(","));
`,
  },
  {
    id: "array-tostring",
    title: "Array.toString 就是 join(\",\")",
    src: `
console.log([1, 2].toString(), "x" + [1, 2], [].toString().length, [null, 1].toString());
`,
  },
  {
    id: "array-isarray-from",
    title: "Array.isArray / Array.from（数组、字符串、集合、映射函数）",
    src: `
console.log(Array.isArray([]), Array.isArray({}), Array.isArray("ab" as any));
console.log(Array.from("abc").join(","), Array.from(new Set([1, 2])).join(","));
console.log(Array.from([1, 2], (v) => v * 3).join(","));
`,
  },
  {
    id: "array-from-arraylike",
    title: "Array.from 一个只有 length 的数组式对象（JS 给空数组）",
    src: `
console.log(Array.from({ a: 1 } as any).length);
`,
  },
  {
    id: "array-of",
    title: "Array.of：与 new Array(n) 的区别",
    src: `
console.log(Array.of(3).length, Array.of(3)[0], new Array(3).length, new Array(3)[0]);
console.log(Array.of(1, 2, 3).join(","), Array.of().length);
`,
  },
  {
    id: "array-lastIndexOf",
    title: "Array.lastIndexOf",
    src: `
console.log([1, 2, 1].lastIndexOf(1), [1, 2, 1].lastIndexOf(1, 1), [1].lastIndexOf(9));
`,
  },
  {
    id: "array-flatMap",
    title: "Array.flatMap",
    src: `
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log(["a b", "c"].flatMap((s) => s.split(" ")).join("|"));
`,
  },
  {
    id: "array-entries-keys-values",
    title: "Array.entries / keys / values（含**洞逐格走**、与 for..of 解构）",
    src: `
console.log([...["a", "b"].entries()].map((p) => p[0] + "=" + p[1]).join(","));
console.log([...[10, 20].keys()].join(","));
console.log([...[10, 20].values()].join(","));
const sparse: any[] = [1, , 3];
console.log([...sparse.keys()].join(","), [...sparse.values()].join(","), [...sparse.entries()].length);
for (const [i, v] of [7, 8].entries()) console.log(i, v);
console.log(Array.from([1, 2].values()).join("-"));
`,
  },
  {
    id: "array-spread-conditional",
    title: "展开一个**条件表达式**（`[...cond ? a : b]`）",
    src: `
const xs = [1, 2];
const ys = [3];
console.log([...xs.length ? xs : ys].join(","));
console.log([...(xs.length ? xs : ys)].join(","));
`,
  },
  {
    id: "array-length-write",
    title: "给 length 赋值：截断 / 补洞",
    src: `
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.join(","), xs.length, xs[3]);
`,
  },
  {
    id: "array-sparse-iteration",
    title: "稀疏数组的遍历：map / forEach 跳过洞、join 补空",
    src: `
const xs: any[] = [1, , 3];
let count = 0;
xs.forEach(() => { count++; });
console.log(count, xs.map((v) => v).length, xs.join("-"));
`,
  },

  // ============ String ============
  {
    id: "string-length-index",
    title: "String.length / 下标读 / at",
    src: `
const s = "abc";
console.log(s.length, s[0], s[2], s[9], s[-1]);
console.log(s.at ? s.at(0) : "no-at", "" .length);
`,
  },
  {
    id: "string-charAt-charCodeAt",
    title: "String.charAt / charCodeAt（越界那一档）",
    src: `
const s = "Abc";
console.log(s.charAt(0), s.charAt(9).length, s.charCodeAt(0), s.charCodeAt(1));
console.log("".charCodeAt(0) !== "".charCodeAt(0));
`,
  },
  {
    id: "string-indexOf",
    title: "String.indexOf / includes / startsWith / endsWith",
    src: `
const s = "hello world";
console.log(s.indexOf("o"), s.indexOf("o", 5), s.indexOf("z"), s.indexOf(""));
console.log(s.includes("world"), s.includes("z"), s.startsWith("hell"), s.endsWith("rld"));
console.log(s.startsWith("world", 6), s.endsWith("hello", 5));
`,
  },
  {
    id: "string-slice-substring",
    title: "String.slice / substring（负下标那一档不一样）",
    src: `
const s = "abcdef";
console.log(s.slice(1, 3), s.slice(-2), s.slice(3), s.slice(9), s.slice(3, 1));
console.log(s.substring(1, 3), s.substring(3, 1), s.substring(-2));
`,
  },
  {
    id: "string-split",
    title: "String.split：分隔符、空分隔符、limit、没找到",
    src: `
console.log("a,b,,c".split(",").join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a-b-c".split("-", 2).join("|"), "abc".split("z").join("|"));
`,
  },
  {
    id: "string-case-trim",
    title: "String.toUpperCase / toLowerCase / trim（只用 ASCII）",
    src: `
console.log("aBc-XyZ".toUpperCase(), "aBc-XyZ".toLowerCase(), "123!".toUpperCase());
console.log("[" + "  hi \\t".trim() + "]", "[" + "   ".trim() + "]", "[" + " m ".trim() + "]");
`,
  },
  {
    id: "string-repeat-pad",
    title: "String.repeat / padStart / padEnd",
    src: `
console.log("ab".repeat(3), "ab".repeat(0).length, "7".padStart(3, "0"), "7".padEnd(3, "."));
console.log("abc".padStart(2, "0"), "x".padStart(5).length);
`,
  },
  {
    id: "string-replace",
    title: "String.replace（第一个）/ replaceAll（全部）",
    src: `
console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("aaa".replace("a", "b"), "aaa".replaceAll("a", "b"));
console.log("abc".replace("z", "y"), "abc".replaceAll("", "-"));
`,
  },
  {
    id: "string-fromCharCode",
    title: "String.fromCharCode / 拼接构造",
    src: `
console.log(String.fromCharCode(65, 66, 67), String.fromCharCode(0x4e2d));
console.log("".concat ? "has" : "none", "a" + "b");
`,
  },
  {
    id: "string-iteration",
    title: "字符串可迭代 + 展开",
    src: `
let s = "";
for (const ch of "abc") s += ch + ".";
console.log(s, [..."xyz"].join("-"), "".length);
`,
  },
  {
    id: "string-concat-method",
    title: "String.concat",
    src: `
console.log("a".concat("b", "c"), "a".concat(""), "".concat("x"));
`,
  },
  {
    id: "string-codePointAt",
    title: "String.codePointAt",
    src: `
const s = "A\\u{1F600}";
console.log(s.codePointAt(0), s.codePointAt(1) > 0xffff, s.codePointAt(9));
`,
  },
  {
    id: "string-lastIndexOf",
    title: "String.lastIndexOf",
    src: `
console.log("abab".lastIndexOf("a"), "abab".lastIndexOf("a", 1), "ab".lastIndexOf("z"));
`,
  },
  {
    id: "string-compare-locale",
    title: "String.localeCompare",
    src: `
console.log("a".localeCompare("b") < 0, "b".localeCompare("a") > 0, "a".localeCompare("a"));
`,
  },

  // ============ Object ============
  {
    id: "object-keys-values-entries",
    title: "Object.keys / values / entries（自有可枚举、顺序）",
    src: `
const o = { b: 1, a: 2, 3: 3 };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(Object.entries(o).map((p) => p[0] + "=" + p[1]).join(","));
console.log(Object.keys([]).length, Object.keys("ab" as any).join(","));
`,
  },
  {
    id: "object-assign",
    title: "Object.assign：后面的盖前面的、返回目标、多个来源",
    src: `
const target: any = { a: 1 };
const out = Object.assign(target, { b: 2 }, { a: 9, c: 3 });
console.log(out === target, JSON.stringify(out));
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { y: 2 })));
`,
  },
  {
    id: "object-freeze",
    title: "Object.freeze / isFrozen：属性写不动、加不上",
    src: `
const o: any = Object.freeze({ a: 1 });
o.a = 2;
o.b = 3;
console.log(o.a, o.b, Object.isFrozen(o), Object.isFrozen({}));
`,
  },
  {
    id: "object-freeze-array-element",
    title: "Object.freeze 的**数组元素**：push 在严格模式里该抛",
    src: `
const a: any = Object.freeze([1]);
try { a.push(2); console.log("pushed", a.length); } catch (e) { console.log("threw", (e as any).name); }
`,
  },
  {
    id: "object-defineProperty",
    title: "Object.defineProperty：value / enumerable",
    src: `
const o: any = {};
Object.defineProperty(o, "x", { value: 1, enumerable: true });
Object.defineProperty(o, "y", { value: 2, enumerable: false });
console.log(o.x, o.y, Object.keys(o).join(","), JSON.stringify(o));
`,
  },
  {
    id: "object-create-prototype",
    title: "Object.create：原型链上的属性怎么被读到",
    src: `
const proto: any = { greet() { return "hi"; } };
const child: any = Object.create(proto);
child.own = 1;
console.log(child.greet(), child.own, "greet" in child, Object.keys(child).join(","));
`,
  },
  {
    id: "object-getPrototypeOf",
    title: "Object.getPrototypeOf / 内建原型的来源",
    src: `
class A {}
console.log(Object.getPrototypeOf(new A()) === A.prototype, A.prototype.constructor === A);
console.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf({}) === Object.prototype);
`,
  },
  {
    id: "object-hasOwnProperty",
    title: "Object.prototype.hasOwnProperty",
    src: `
class A { m() { return 1; } }
const a: any = new A();
a.own = 2;
console.log(a.hasOwnProperty("own"), a.hasOwnProperty("m"), ({}).hasOwnProperty("x"));
`,
  },
  {
    id: "object-tostring-tag",
    title: "Object.prototype.toString：只答能证的那一格",
    src: `
console.log(Object.prototype.toString.call({}));
`,
  },
  {
    id: "object-valueof",
    title: "Object.prototype.valueOf：默认给对象自己",
    src: `
const o: any = { a: 1 };
console.log(o.valueOf() === o, typeof o.valueOf());
`,
  },
  {
    id: "object-fromEntries",
    title: "Object.fromEntries",
    src: `
console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["k", "v"]]))));
`,
  },
  {
    id: "object-getOwnPropertyNames",
    title: "Object.getOwnPropertyNames（含不可枚举）",
    src: `
const o: any = {};
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
console.log(Object.getOwnPropertyNames(o).join(","), Object.keys(o).length);
`,
  },

  // ============ Math ============
  {
    id: "math-rounding",
    title: "Math.floor / ceil / round / trunc / sign",
    src: `
console.log(Math.floor(1.7), Math.floor(-1.2), Math.ceil(1.2), Math.ceil(-1.7));
console.log(Math.round(1.5), Math.round(2.5), Math.round(-1.5), Math.trunc(-1.7), Math.sign(-3), Math.sign(0));
`,
  },
  {
    id: "math-abs-min-max",
    title: "Math.abs / min / max（多实参、空实参）",
    src: `
console.log(Math.abs(-5), Math.abs(5), Math.min(3, 1, 2), Math.max(3, 1, 2));
console.log(Math.min(), Math.max(), Math.min(-0, 0));
`,
  },
  {
    id: "math-pow-sqrt",
    title: "Math.pow / sqrt / cbrt / hypot",
    src: `
console.log(Math.pow(2, 10), Math.pow(2, 0.5) === Math.sqrt(2), Math.sqrt(16), Math.cbrt(27));
console.log(Math.hypot(3, 4));
`,
  },
  {
    id: "math-logs-constants",
    title: "Math.log / exp / PI / E（含常量是**数**不是方法）",
    src: `
console.log(Math.log(1), Math.log(Math.E) === 1, Math.exp(0), Math.exp(1) === Math.E);
console.log(Math.PI > 3.14 && Math.PI < 3.15, Math.E > 2.7);
console.log(typeof Math.PI, Math.PI * 2 > 6.28);
`,
  },
  {
    id: "math-isnan-family",
    title: "Math 的取舍：非数值实参怎么处理",
    src: `
console.log(Math.floor("2.5" as any), Math.abs("-3" as any));
console.log(Math.max(1, "9" as any), Math.min(1, NaN));
`,
  },

  // ============ Number ============
  {
    id: "number-isinteger-isfinite",
    title: "Number.isInteger / isFinite / isNaN（不做转换）",
    src: `
console.log(Number.isInteger(1), Number.isInteger(1.5), Number.isInteger("1" as any));
console.log(Number.isFinite(1), Number.isFinite(1 / 0), Number.isFinite("1" as any));
console.log(Number.isNaN(NaN), Number.isNaN("abc" as any));
`,
  },
  {
    id: "number-static-parse",
    title: "Number.parseInt / parseFloat 与全局那两个的差别（含「同一个函数」）",
    src: `
console.log(Number.parseInt("42px"), Number.parseInt("ff", 16), Number.parseFloat("3.5x"));
console.log(parseInt("42px"), parseFloat("3.5x"), parseInt(""), parseInt("0x10"));
console.log(Number.parseInt === parseInt, Number.parseFloat === parseFloat);
`,
  },
  {
    id: "number-constants",
    title: "Number.MAX_SAFE_INTEGER / MIN_SAFE_INTEGER / EPSILON",
    src: `
console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(Number.EPSILON > 0);
`,
  },
  {
    id: "number-tofixed",
    title: "Number.toFixed（含进位与补零）",
    src: `
console.log((1.2345).toFixed(2), (1.005).toFixed(2), (2).toFixed(3), (0.5).toFixed(0));
console.log((1234.5678).toFixed(1), (-1.5).toFixed(0));
`,
  },
  {
    id: "number-tostring-radix",
    title: "Number.toString(基数) 与默认形态",
    src: `
console.log((255).toString(16), (255).toString(2), (8).toString(8), (10).toString());
console.log((0.5).toString(), (1e21).toString());
`,
  },
  {
    id: "number-toprecision-valueof",
    title: "Number.toPrecision / valueOf",
    src: `
console.log((1.2345).toPrecision(3), (12345).toPrecision(2), (5).valueOf(), true.valueOf());
`,
  },

  // ============ JSON ============
  {
    id: "json-stringify-primitives",
    title: "JSON.stringify：数 / 串 / 布尔 / null / undefined",
    src: `
console.log(JSON.stringify(1), JSON.stringify("a"), JSON.stringify(true), JSON.stringify(null));
console.log(JSON.stringify(undefined), JSON.stringify(0.5), JSON.stringify(-0));
`,
  },
  {
    id: "json-stringify-containers",
    title: "JSON.stringify：对象 / 数组 / 嵌套 / 键序",
    src: `
console.log(JSON.stringify({ a: 1, b: [1, 2], c: { d: null } }));
console.log(JSON.stringify([1, "a", true, null]));
console.log(JSON.stringify({ b: 1, a: 2 }), JSON.stringify([]), JSON.stringify({}));
`,
  },
  {
    id: "json-stringify-specials",
    title: "JSON.stringify：不可序列化的值怎么处理（函数 / undefined 键）",
    src: `
console.log(JSON.stringify({ a: undefined, b: 1 }), JSON.stringify([undefined, 1]));
console.log(JSON.stringify({ f: () => 1, n: 2 }));
`,
  },
  {
    id: "json-stringify-indent",
    title: "JSON.stringify 的缩进实参（数与字符串两种形态）",
    src: `
const o = { a: [1, 2] };
console.log(JSON.stringify(o, null, 2));
console.log(JSON.stringify(o, null, 0));
console.log(JSON.stringify(o, null, "\\t").length > JSON.stringify(o).length);
`,
  },
  {
    id: "json-parse-basic",
    title: "JSON.parse：对象 / 数组 / 标量 / 嵌套 / 空白",
    src: `
console.log(JSON.parse('{"a":1,"b":[1,2]}').b[1]);
console.log(JSON.parse("[1,2,3]").length, JSON.parse("  7  "), JSON.parse("true"), JSON.parse("null"));
console.log(JSON.parse('{"n":{"m":2}}').n.m, JSON.parse('"s"'));
`,
  },
  {
    id: "json-roundtrip",
    title: "JSON 往返：序列化再解析回来是同一个值",
    src: `
const o = { a: 1, b: "x", c: [true, null], d: { e: 2.5 } };
const back = JSON.parse(JSON.stringify(o));
console.log(JSON.stringify(back) === JSON.stringify(o), back.d.e);
`,
  },
  {
    id: "json-parse-error",
    title: "JSON.parse 坏输入要抛（且是可接住的那种）",
    src: `
for (const bad of ["{", "[1,", "nope", ""]) {
  try { JSON.parse(bad); console.log("no-throw", bad.length); }
  catch (e: any) { console.log("threw", bad.length); }
}
`,
  },

  // ============ Map / Set ============
  {
    id: "map-basic",
    title: "Map：set / get / has / delete / size / 覆盖写",
    src: `
const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.get("a"), m.get("z"), m.has("a"), m.size);
m.set("a", 9);
console.log(m.get("a"), m.delete("a"), m.delete("a"), m.size);
`,
  },
  {
    id: "map-keys-values-entries",
    title: "Map.keys / values / entries / forEach / 展开",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map((p) => p[0] + p[1]).join(","));
let s = "";
m.forEach((v, k) => { s += k + "=" + v + ";"; });
console.log(s, [...m].length);
`,
  },
  {
    id: "map-object-keys",
    title: "Map 的键可以是对象、NaN 也算同一个键",
    src: `
const key = { id: 1 };
const m = new Map<any, string>();
m.set(key, "obj");
m.set(NaN, "nan");
console.log(m.get(key), m.get(NaN), m.get({ id: 1 }), m.size);
`,
  },
  {
    id: "set-basic",
    title: "Set：add / has / delete / size / 去重",
    src: `
const s = new Set<number>([1, 2, 2, 3]);
console.log(s.size, s.has(2), s.has(9), [...s].join(","));
console.log(s.delete(1), s.delete(1), s.size);
s.add(4).add(4);
console.log([...s].join(","));
`,
  },
  {
    id: "set-forEach-union",
    title: "Set.forEach 与两集合的并集 / 交集写法",
    src: `
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
const union = new Set([...a, ...b]);
const both = new Set([...a].filter((v) => b.has(v)));
console.log([...union].join(","), [...both].join(","));
let s = "";
a.forEach((v) => { s += v; });
console.log(s);
`,
  },
  {
    id: "collection-prototype",
    title: "集合族的 prototype / constructor / instanceof",
    src: `
console.log(new Map() instanceof Map, new Set() instanceof Set, [] instanceof Array);
console.log(Object.getPrototypeOf(new Map()) === Map.prototype, Map.prototype.constructor === Map);
console.log(new Map() instanceof Set, new Set() instanceof Map);
`,
  },
  {
    id: "collection-in-object-keys",
    title: "集合的内部槽不出现在 Object.keys / JSON 里",
    src: `
const m = new Map([["a", 1]]);
console.log(Object.keys(m).length, JSON.stringify(m), Object.keys(new Set([1])).length);
`,
  },

  // ============ Symbol ============
  {
    id: "symbol-iterator",
    title: "Symbol.iterator：自定义可迭代物进展开 / for..of",
    src: `
const o: any = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: i++, done: false } : { value: 0, done: true }) };
  },
};
console.log([...o].join(","), [..."ab"].join(","));
`,
  },
  {
    id: "symbol-toprimitive",
    title: "Symbol.toPrimitive：参与算术与字符串化",
    src: `
const o: any = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 7 : "S"; } };
console.log(o + 1, "" + o, o * 2);
`,
  },
  {
    id: "symbol-hasinstance",
    title: "Symbol.hasInstance：自定义 instanceof",
    src: `
class Even {
  static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
}
console.log(2 instanceof (Even as any), 3 instanceof (Even as any));
`,
  },
  {
    id: "symbol-tostringtag",
    title: "Symbol.toStringTag：影响 Object.prototype.toString",
    src: `
const o: any = { [Symbol.toStringTag]: "Custom" };
console.log(Object.prototype.toString.call(o));
console.log(Object.prototype.toString.call(new Map()));
`,
  },
  {
    id: "symbol-description",
    title: "Symbol() 的 description / 唯一性 / 当键",
    src: `
const s1 = Symbol("tag");
const s2 = Symbol("tag");
console.log(s1 === s2, String(s1.description));
const o: any = {};
o[s1] = 1;
console.log(o[s1], Object.keys(o).length);
`,
  },
  {
    id: "symbol-string-of-symbol",
    title: "`String(符号)` 是一条**特例**（给 `\"Symbol(描述)\"`，不走 ToPrimitive）",
    src: `
console.log(String(Symbol.iterator) === "Symbol(Symbol.iterator)");
console.log(String(Symbol("s")), String(Symbol()), String(Symbol.iterator).length > 0);
`,
  },
  {
    id: "symbol-concat-throws",
    title: "符号进字符串拼接 / 模板串要抛（而且要是 `TypeError`）",
    src: `
try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log("threw", e.name); }
try { console.log(\`\${Symbol("t") as any}\`); } catch (e: any) { console.log("threw", e.name); }
`,
  },

  // ============ Date ============
  {
    id: "date-epoch-gettime",
    title: "new Date(ms) / getTime / valueOf / 算术",
    src: `
const d = new Date(1000);
console.log(d.getTime(), d.valueOf(), +d, d.getTime() === 1000);
console.log(new Date(0).getTime(), new Date(1500).getTime() - new Date(500).getTime());
`,
  },
  {
    id: "date-compare",
    title: "Date 的比较：靠 ToPrimitive",
    src: `
const a = new Date(1000);
const b = new Date(2000);
console.log(a < b, a > b, a <= b, b - a, a == a);
`,
  },
  {
    id: "date-utc-parts",
    title: "Date 的 UTC 分量（一个确定的时刻）",
    src: `
const d = new Date(0);
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
`,
  },
  {
    id: "date-instanceof",
    title: "Date 的原型格与 instanceof",
    src: `
console.log(new Date(0) instanceof Date, Object.getPrototypeOf(new Date(0)) === Date.prototype);
console.log(typeof Date, Date.prototype.constructor === Date);
`,
  },

  // ============ console ============
  {
    id: "console-log-args",
    title: "console.log：多实参用空格接、各行一条",
    src: `
console.log("a", "b", 1, true, null, undefined);
console.log();
console.log("only");
console.log(1, 2);
`,
  },
  {
    id: "console-log-numbers",
    title: "console.log 的数值形态：整数 / 浮点 / -0 / NaN / Infinity",
    src: `
console.log(1, 1.5, -0, 0 / 0, 1 / 0, -1 / 0);
console.log(0.1 + 0.2, 1e21, 1e-7);
`,
  },
  {
    id: "console-log-objects",
    title: "console.log 的容器形态：对象 / 数组 / 嵌套 / 空",
    src: `
console.log({ a: 1, b: "x" });
console.log([1, 2, 3], []);
console.log({ nested: { deep: [1, { k: true }] } });
console.log({});
`,
  },
  {
    id: "console-log-special",
    title: "console.log 遇上 Map / Set / Error / 函数 / 符号",
    src: `
console.log(new Map([["a", 1]]));
console.log(new Set([1, 2]));
console.log(new Error("boom"));
console.log(Symbol("s"));
`,
  },
  {
    id: "console-log-strings",
    title: "console.log 的字符串形态：引号、换行、空串",
    src: `
console.log("plain");
console.log("with \\"quotes\\"");
console.log("");
console.log("multi\\nline");
`,
  },

  // ============ Error ============
  {
    id: "error-families",
    title: "Error / TypeError / RangeError 与 name / message",
    src: `
console.log(new Error("e").name, new Error("e").message);
console.log(new TypeError("t").name, new RangeError("r").name);
console.log(Error("no-new").message, TypeError("t2").name);
`,
  },
  {
    id: "error-instanceof",
    title: "错误家族的 instanceof 与 instanceof Error",
    src: `
const e = new TypeError("x");
console.log(e instanceof TypeError, e instanceof Error, e instanceof RangeError);
try { null.x; } catch (err: any) { console.log(err instanceof TypeError, err.name); }
`,
  },
  {
    id: "error-engine-throws",
    title: "引擎自己抛的错也是 TypeError（且能接住）",
    src: `
try { const o: any = undefined; o.x; } catch (e: any) { console.log("prop", e.name, e instanceof TypeError); }
try { (1 as any)(); } catch (e: any) { console.log("call", e.name, e instanceof Error); }
`,
  },
  {
    id: "error-tostring",
    title: "Error.prototype.toString 的形态",
    src: `
console.log(String(new Error("msg")));
console.log(String(new TypeError("bad")));
console.log("" + new Error("m"));
`,
  },
  {
    id: "error-custom-subclass",
    title: "自定义错误类：继承 Error、带额外字段、能接住",
    src: `
class ValidationError extends Error {
  field: string;
  constructor(field: string) { super("invalid " + field); this.field = field; this.name = "ValidationError"; }
}
try { throw new ValidationError("email"); }
catch (e: any) { console.log(e.name, e.message, e.field, e instanceof ValidationError, e instanceof Error); }
`,
  },

  // ============ Promise（全局） ============
  {
    id: "promise-resolve-then",
    title: "Promise.resolve / then 的链路",
    src: `
Promise.resolve("v").then((v: any) => console.log("got", v));
Promise.resolve().then(() => console.log("empty-resolve"));
console.log("sync");
`,
  },
  {
    id: "promise-reject-catch-finally",
    title: "Promise.reject / catch / finally",
    src: `
Promise.reject("r").catch((e: any) => console.log("caught", e));
Promise.resolve(1).finally(() => console.log("fin")).then((v: any) => console.log("after", v));
`,
  },
  {
    id: "promise-constructor",
    title: "`new Promise(executor)`：同步跑执行器、resolve / reject",
    src: `
new Promise((resolve: any) => { console.log("executor"); resolve(5); }).then((v: any) => console.log("resolved", v));
new Promise((_resolve: any, reject: any) => reject("no")).catch((e: any) => console.log("rejected", e));
`,
  },
  {
    id: "promise-chaining-errors",
    title: "链上的错误：抛出来的会被下一段 catch 接住",
    src: `
Promise.resolve(1)
  .then((v: number) => { throw new Error("mid"); })
  .then((v: number) => console.log("skipped", v))
  .catch((e: any) => console.log("caught", e.message));
`,
  },
  {
    id: "promise-all-kinds",
    title: "Promise.all：混合值、空数组、有一个拒绝",
    src: `
Promise.all([1, Promise.resolve(2), "3"]).then((xs: any) => console.log("mixed", xs.join(",")));
Promise.all([Promise.reject("bad"), Promise.resolve(1)]).catch((e: any) => console.log("rejected", e));
`,
  },
  {
    id: "promise-async-await-forms",
    title: "async 箭头函数 / 方法 / await 链",
    src: `
const f = async (n: number) => { const v = await Promise.resolve(n); return v * 2; };
f(3).then((v: number) => console.log("arrow", v));
class Api { async load(): Promise<string> { return await Promise.resolve("data"); } }
new Api().load().then((v: string) => console.log("method", v));
`,
  },

  // ============ 全局 ============
  {
    id: "global-parseint-parsefloat",
    title: "全局 parseInt / parseFloat（含基数与半个数字）",
    src: `
console.log(parseInt("12"), parseInt("12.9"), parseInt("0x1f"), parseInt("ff", 16), parseInt("z"));
console.log(parseFloat("1.5"), parseFloat("1.5e2"), parseFloat("x"), parseFloat(".5"));
`,
  },
  {
    id: "global-isnan-isfinite",
    title: "全局 isNaN / isFinite 与 Number.* 不是一回事",
    src: `
console.log(isNaN("abc"), isNaN("12"), isNaN(NaN), isNaN(undefined));
console.log(isFinite("3"), isFinite("x"), isFinite(1 / 0), Number.isFinite("3" as any));
`,
  },
  {
    id: "global-nan-infinity",
    title: "NaN / Infinity / undefined 是全局上的只读属性",
    src: `
console.log(NaN === NaN, Infinity > 1e308, -Infinity < -1e308, typeof undefined);
console.log(globalThis.NaN === NaN, globalThis.Infinity > 0, globalThis.undefined === undefined);
`,
  },
  {
    id: "global-boolean",
    title: "Boolean(x)：每个类型各一档",
    src: `
console.log(Boolean(0), Boolean(1), Boolean(""), Boolean("0"), Boolean(null), Boolean(undefined));
console.log(Boolean(NaN), Boolean([]), Boolean({}), Boolean(new Boolean(false) as any));
`,
  },
  {
    id: "global-number-string",
    title: "Number(x) / String(x)：转换表",
    src: `
console.log(Number("12"), Number(""), Number(" 7 "), Number("x"), Number(true), Number(null));
console.log(String(1), String(true), String(null), String(undefined), String([1, 2]), String({}));
`,
  },
  {
    id: "global-array-object-ctors",
    title: "Array / Object 当函数用与当构造器用",
    src: `
console.log(Array(3).length, Array(1, 2).length, Object({ a: 1 }).a, new Object(null as any) !== null);
console.log(typeof Array, typeof Object, Array.isArray(Array(1)));
`,
  },
  {
    id: "global-this",
    title: "globalThis 指向那个环境对象自己",
    src: `
console.log(globalThis.Math === Math, globalThis.JSON === JSON, typeof globalThis);
console.log(globalThis.undefined === undefined, globalThis.NaN === NaN);
`,
  },
  // ===== 第 228 轮补的一批 =====
  {
    id: "symbol-concat-error-family",
    title: "符号进字符串拼接：抛的是 `TypeError`（不是笼统的 `Error`）",
    src: `
// **这里不写模板串** ✗：模板串那一档已有判据 \`symbol-concat-throws\` ✓，
// 而在 \`.mjs\` 的模板串里嵌模板串要连着两层转义 ✓，读起来比它量的东西复杂 ✗。
try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log("plus", e.name, e instanceof TypeError); }
try { console.log("y" + String(Symbol("t") as any)); } catch (e: any) { console.log("str", e.name); }
console.log(typeof Symbol, String(Symbol("d")));
try { console.log(1 + (Symbol("n") as any)); } catch (e: any) { console.log("num", e.name); }
`,
  },
  {
    id: "function-prototype-shape",
    title: "`Function.prototype` 是一个真落点：`call` / `apply` / `bind` 都在它上面",
    src: `
function add(a: number, b: number) { return a + b; }
console.log(typeof Function, typeof Function.prototype, typeof Function.prototype.call);
console.log(Function.prototype.call === Function.prototype.call);
// **绑定结果要先落到一个名字上** ✓：\`add.bind(null, 5)(6)\`（**调用一个调用结果**）
// 是**记在台账里的已知缺口** ✗（投影层那一族 ✓），与本条要量的东西无关 ✓。
const bound = add.bind(null, 5);
console.log(add.call(null, 1, 2), add.apply(null, [3, 4]), bound(6));
console.log(bound.call(null, 100), typeof bound.bind);
console.log(Object.prototype.toString.call([]), Object.prototype.toString.call(1));
`,
  },

  // ============ 第 273 轮加宽（45 条）：标准库里「普通 `.ts` 常见」的那些成员 ============
  //
  // 同一条普查口径 ✓。这一批的量法**先问「在不在」再问「对不对」** ✗：
  // 先拿一个探针把候选成员逐个 `typeof` 一遍 ✓（`Array.prototype.values` ✓ /
  // `Math.imul` ✗ / `Object.is` ✗ …），于是「**成员根本不在那儿**」与
  // 「**在、但语义不对**」两类缺口被分开了 ✓——它们的修法不一样 ✓
  //（前者是往表里补一格 ✓，后者要动引擎 ✓）。
  {
    id: "array-every-some",
    title: "every / some 的短路与空数组",
    src: `
const xs = [2, 4, 6];
console.log(xs.every((v) => v % 2 === 0), xs.some((v) => v > 5), xs.some((v) => v > 99));
console.log([].every(() => false), [].some(() => true));
let calls = 0;
[1, 2, 3].every((v) => { calls++; return v < 2; });
console.log("calls", calls);
`,
  },
  {
    id: "array-reduceRight",
    title: "reduceRight 的方向与初值",
    src: `
const xs = ["a", "b", "c"];
console.log(xs.reduceRight((acc, v) => acc + v, ""));
console.log([1, 2, 3].reduceRight((a, b) => a - b), [1, 2, 3].reduceRight((a, b) => a - b, 10));
`,
  },
  {
    id: "array-copyWithin",
    title: "copyWithin 的三格实参与负下标",
    src: `
const a = [1, 2, 3, 4, 5];
console.log(a.copyWithin(0, 3).join(","));
const b = [1, 2, 3, 4, 5];
console.log(b.copyWithin(1, 0, 2).join(","));
const c = [1, 2, 3, 4, 5];
console.log(c.copyWithin(-2, 0).join(","), c.length);
`,
  },
  {
    id: "array-findLast",
    title: "findLast / findLastIndex 与没找到",
    src: `
const xs = [1, 2, 3, 4, 5];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 99), xs.findLastIndex((v) => v > 99));
`,
  },
  {
    id: "array-indexof-fromindex",
    title: "indexOf / lastIndexOf / includes 的起始下标与负数",
    src: `
const xs = [1, 2, 3, 2, 1];
console.log(xs.indexOf(2), xs.indexOf(2, 2), xs.indexOf(2, -2), xs.indexOf(9));
console.log(xs.lastIndexOf(2), xs.lastIndexOf(1, 2), xs.lastIndexOf(9));
console.log(xs.includes(2, 4), xs.includes(1, 4));
`,
  },
  {
    id: "array-join-nullish",
    title: "join 把 null / undefined / 洞 变成空串",
    src: `
const xs: any[] = [1, null, undefined, "a", , 2];
console.log(xs.join("-"), xs.join(""), [].join("-"), [undefined].join("-"));
console.log([1, 2].join(), [1, 2].toString());
`,
  },
  {
    id: "array-flat-depth",
    title: "flat 的深度参数与 Infinity",
    src: `
const xs: any[] = [1, [2, [3, [4]]]];
console.log(xs.flat().join(","), xs.flat(2).join(","), xs.flat(Infinity).join(","));
console.log(xs.flat(0).length, [].flat().length);
`,
  },
  {
    id: "array-tostring-nested",
    title: "数组的 toString / String() / 模板里的形态",
    src: `
const xs: any = [1, [2, 3], null, undefined];
console.log(String(xs), xs.toString(), \`\${xs}\`);
console.log([].toString().length, String([1, 2]));
`,
  },
  {
    id: "array-sort-strings-and-mixed",
    title: "默认排序走字符串 / 数字比较器 / 反向",
    src: `
console.log([10, 9, 1].sort().join(","));
console.log([10, 9, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
`,
  },
  {
    id: "array-toSorted-and-with",
    title: "非破坏式的那几支：toSorted / toReversed / with",
    src: `
const xs = [3, 1, 2];
console.log(xs.toSorted((a, b) => a - b).join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(1, 9).join(","), xs.join(","));
`,
  },
  {
    id: "array-iterator-manual",
    title: "手动取数组迭代器：values / keys / entries 的 next()",
    src: `
const it = [10, 20].values();
console.log(it.next().value, it.next().value, it.next().done);
const ks = [10, 20].keys();
console.log(ks.next().value, ks.next().value, ks.next().done);
console.log([...["a", "b"].entries()].map((p) => p.join(":")).join(","));
`,
  },
  {
    id: "string-includes-starts-ends",
    title: "includes / startsWith / endsWith 的起始位置",
    src: `
const s = "hello world";
console.log(s.includes("o"), s.includes("o", 5), s.includes("z"));
console.log(s.startsWith("hello"), s.startsWith("world", 6), s.endsWith("world"));
console.log(s.endsWith("hello", 5));
`,
  },
  {
    id: "string-at-and-codepoints",
    title: "at / codePointAt / fromCodePoint 与代理对",
    src: `
const s = "a\\u{1F600}b";
console.log(s.at(0), s.at(-1), s.at(99), s.at(1).length);
console.log(s.codePointAt(1), "A".codePointAt(0));
console.log(String.fromCodePoint(65, 0x1f600).length, String.fromCharCode(65, 66));
`,
  },
  {
    id: "string-trim-variants",
    title: "trim / trimStart / trimEnd 与各种空白",
    src: `
const s = "  \\t x y \\n ";
console.log("[" + s.trim() + "]", "[" + s.trimStart() + "]", "[" + s.trimEnd() + "]");
console.log("".trim().length, "  ".trim().length);
`,
  },
  {
    id: "string-split-forms",
    title: "split 的分隔符 / 限制条数 / 空串",
    src: `
console.log("a,b,,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a1b2c".split("1").join("+"));
`,
  },
  {
    id: "string-replace-forms",
    title: "replace / replaceAll 的字面量替换与特殊字符",
    src: `
console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("aaa".replaceAll("a", "b"), "abc".replace("z", "y"));
console.log("a.b".replaceAll(".", "!"), "$x$".replaceAll("$", "#"));
`,
  },
  {
    id: "string-pad-and-repeat-forms",
    title: "padStart / padEnd / repeat 的边界",
    src: `
console.log("5".padStart(3, "0"), "5".padEnd(3, "-"), "abc".padStart(2, "0"));
console.log("ab".repeat(3), "ab".repeat(0).length, "x".padStart(5).length);
console.log("7".padStart(3, "ab"));
`,
  },
  {
    id: "string-compare-and-locale",
    title: "字符串比较：`<` / localeCompare / 大小写",
    src: `
console.log("a" < "b", "B" < "a", "abc" < "abd", "a" === "a");
console.log("a".localeCompare("b"), "b".localeCompare("a"), "a".localeCompare("a"));
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "aB".toUpperCase());
`,
  },
  {
    id: "number-parse-radix-and-failure",
    title: "parseInt / parseFloat 的进制与失败值",
    src: `
console.log(parseInt("42"), parseInt("0x1f"), parseInt("1f", 16), parseInt("ff", 16));
console.log(parseInt("12px"), parseInt("px"), parseInt(""), parseFloat("3.5x"));
console.log(Number.parseInt("101", 2), Number.parseFloat(".5"), Number("  7  "), Number("x"));
`,
  },
  {
    id: "number-tofixed-rounding",
    title: "toFixed 的舍入与补零",
    src: `
console.log((1.005).toFixed(2), (1.55).toFixed(1), (2).toFixed(2), (0).toFixed(0));
console.log((-1.5).toFixed(1), (1234.5678).toFixed(3), (1e21).toFixed(2));
`,
  },
  {
    id: "number-tostring-radix-forms",
    title: "toString 的进制（2 / 8 / 16 / 36）与负数",
    src: `
console.log((255).toString(16), (255).toString(2), (8).toString(8), (35).toString(36));
console.log((-255).toString(16), (0).toString(16), (1.5).toString(2).length > 0);
`,
  },
  {
    id: "number-valueof-and-conversion",
    title: "valueOf / Number() / 原始值包装对象的身份",
    src: `
const n = 5;
console.log(n.valueOf(), n.toString(), Number(n), typeof n.valueOf());
console.log(Number(true), Number(false), Number(null), Number(undefined), Number(""));
console.log(Number([]), Number([7]), Number([1, 2]));
`,
  },
  {
    id: "math-trunc-sign",
    title: "Math.trunc / sign / ceil / floor 的负数",
    src: `
console.log(Math.trunc(4.7), Math.trunc(-4.7), Math.floor(-4.1), Math.ceil(-4.1));
console.log(Math.sign(-3), Math.sign(0), Math.sign(3), Math.sign(-0), Math.sign(NaN));
console.log(Math.round(2.5), Math.round(-2.5), Math.round(2.4));
`,
  },
  {
    id: "math-hypot-and-roots",
    title: "Math.hypot / cbrt / exp / log 一支",
    src: `
console.log(Math.hypot(3, 4), Math.cbrt(27), Math.cbrt(-8));
console.log(Math.exp(0), Math.log(1), Math.log10(1000), Math.log2(8), Math.log1p(0));
console.log(Math.expm1(0), Math.sinh(0), Math.cosh(0), Math.tanh(0));
`,
  },
  {
    id: "math-imul-clz32",
    title: "Math.imul / clz32 / fround 这三个 32 位工具",
    src: `
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0xffffffff, 5));
console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
console.log(Math.fround(1.5), Math.fround(1 / 3), Math.fround(0.1));
`,
  },
  {
    id: "math-min-max-edge",
    title: "Math.min / max 的边界：空参 / Infinity / NaN，与 Math.abs(-0)",
    src: `
console.log(Math.min(3, 1, 2), Math.max(3, 1, 2), Math.min(), Math.max());
console.log(Math.min(NaN, 1), Math.max(Infinity, 1), Math.min(-Infinity, 1));
console.log(Math.abs(-0), 1 / Math.abs(-0), Math.abs(-0) === 0);
`,
  },
  {
    id: "object-is",
    title: "Object.is 与 `===` 的两处不同",
    src: `
console.log(Object.is(NaN, NaN), NaN === NaN);
console.log(Object.is(0, -0), 0 === -0);
console.log(Object.is("a", "a"), Object.is({}, {}), Object.is(null, null));
`,
  },
  {
    id: "object-getownpropertydescriptor",
    title: "getOwnPropertyDescriptor 的形状与缺失",
    src: `
const o = { a: 1 };
const d: any = Object.getOwnPropertyDescriptor(o, "a");
console.log(d.value, d.writable, d.enumerable, d.configurable);
console.log(Object.getOwnPropertyDescriptor(o, "zzz"));
console.log(Object.getOwnPropertyNames(o).join(","));
`,
  },
  {
    id: "object-seal-and-defineProperties",
    title: "Object.seal 那一条与一次定义多个属性",
    src: `
const o: any = {};
Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { value: 2, enumerable: false } });
console.log(o.a, o.b, Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
const s: any = Object.seal({ x: 1 });
s.x = 2;
console.log(s.x, Object.isSealed(s), Object.isFrozen(s));
`,
  },
  {
    id: "object-entries-order-and-values",
    title: "entries / values 的顺序与整数键",
    src: `
const o: any = { b: 1, 2: 2, a: 3, 1: 4 };
console.log(Object.entries(o).map((p) => p[0] + "=" + p[1]).join(","));
console.log(Object.values(o).join(","), Object.keys(o).length);
console.log(Object.entries({}).length, Object.values({}).length);
`,
  },
  {
    id: "object-assign-forms",
    title: "Object.assign 的多个来源与返回值身份",
    src: `
const t: any = { a: 1 };
const r = Object.assign(t, { b: 2 }, { a: 9, c: 3 });
console.log(JSON.stringify(t), r === t, Object.keys(t).join(","));
console.log(JSON.stringify(Object.assign({}, null as any, undefined as any, { d: 4 })));
`,
  },
  {
    id: "json-stringify-replacer",
    title: "JSON.stringify 的 replacer 数组与 toJSON",
    src: `
const o: any = { a: 1, b: 2, c: 3, d: { e: 4 } };
console.log(JSON.stringify(o, ["a", "c"]));
console.log(JSON.stringify({ when: new Date(0) }));
console.log(JSON.stringify({ n: NaN, u: undefined, f: () => 1, ok: 1 }));
`,
  },
  {
    id: "json-parse-reviver",
    title: "JSON.parse 的 reviver 与错误那一档",
    src: `
const o = JSON.parse('{"a":1,"b":{"c":2}}', (k, v) => (typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(o));
try { JSON.parse("{oops}"); } catch (e) { console.log("parse failed", e instanceof SyntaxError); }
console.log(JSON.parse("[1,2,3]").length, JSON.parse('"s"'), JSON.parse("null"));
`,
  },
  {
    id: "map-chaining-clear",
    title: "Map 的链式写、clear、delete 与 size",
    src: `
const m = new Map<string, number>();
m.set("a", 1).set("b", 2).set("a", 3);
console.log(m.size, m.get("a"), m.has("b"), m.delete("b"), m.size);
console.log(m.delete("zzz"));
m.clear();
console.log(m.size, m.get("a"));
`,
  },
  {
    id: "map-foreach-order-and-spread",
    title: "Map 的遍历顺序与三种展开",
    src: `
const m = new Map<string, number>([["b", 2], ["a", 1], ["c", 3]]);
m.set("d", 4);
const seen: string[] = [];
m.forEach((v, k) => seen.push(k + v));
console.log(seen.join(","));
console.log([...m.keys()].join(","), [...m.values()].join(","), [...m].length);
console.log(JSON.stringify([...m.entries()]));
`,
  },
  {
    id: "set-iteration-and-ops",
    title: "Set 的遍历、交集手写、与数组互转",
    src: `
const s = new Set<number>([3, 1, 2, 3]);
console.log([...s].join(","), s.size, s.has(2), s.delete(1), s.size);
const other = new Set<number>([2, 5]);
console.log([...s].filter((v) => other.has(v)).join(","));
console.log([...s].map((v) => v * 2).join(","), Array.from(s).length);
`,
  },
  {
    id: "symbol-registry",
    title: "Symbol.for / keyFor 的注册表与 identity",
    src: `
const a = Symbol.for("shared");
const b = Symbol.for("shared");
const c = Symbol("shared");
console.log(a === b, a === c, Symbol.keyFor(a), Symbol.keyFor(c));
console.log(typeof Symbol.keyFor(Symbol.for("x")), a.toString() === c.toString());
`,
  },
  {
    id: "date-iso-and-json",
    title: "Date 的 toISOString / toJSON / 各处 UTC 取值",
    src: `
const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5));
console.log(d.toISOString(), d.toJSON(), JSON.stringify({ d }));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
console.log(new Date(0).toISOString(), new Date("2021-03-04T05:06:07Z").getTime());
`,
  },
  {
    id: "date-utc-setters",
    title: "Date 的 UTC 写入口与时间戳往返",
    src: `
const d = new Date(0);
d.setUTCFullYear(2000);
d.setUTCMonth(5, 15);
d.setUTCHours(1, 2, 3, 4);
console.log(d.toISOString(), d.getTime());
const e = new Date(d.getTime());
console.log(e.toISOString() === d.toISOString(), e.getTime() - d.getTime());
`,
  },
  {
    id: "error-cause-and-family",
    title: "Error 的 cause / 各子族 / name 与 message",
    src: `
const e = new Error("outer", { cause: new Error("inner") });
console.log(e.message, (e.cause as Error).message);
const t = new TypeError("bad type");
console.log(t.name, t.message, t instanceof TypeError, t instanceof Error, t instanceof RangeError);
console.log(String(new RangeError("r")), String(new SyntaxError()));
`,
  },
  {
    id: "global-explicit-coercions",
    title: "String() / Number() / Boolean() 三个全局转换",
    src: `
console.log(String(1), String(null), String(undefined), String([1, 2]), String({}));
console.log(Number("12"), Number(""), Number(" "), Number(true));
console.log(Boolean(0), Boolean(""), Boolean(null), Boolean([]), Boolean({}));
`,
  },
  {
    id: "console-log-multi-and-nested",
    title: "console.log 多个实参 + 嵌套容器的形态",
    src: `
console.log("a", 1, true, null, undefined);
console.log([1, [2, [3]]], { a: { b: [1, 2] } });
console.log({ s: "x", n: 2, ok: false, nested: { deep: { deeper: 1 } } });
`,
  },
  {
    id: "function-length-and-name",
    title: "函数的 length / name 与声明式 / 箭头式 / 方法",
    src: `
function three(a: number, b: number, c: number) { return a + b + c; }
const two = (a: number, b: number) => a + b;
const o = { method(a: number, b: number, c: number, d: number) { return d; } };
console.log(three.length, two.length, o.method.length, three.name, two.name);
`,
  },
  {
    id: "function-prototype-tostring",
    title: "Function.prototype.toString 给源码文本",
    src: `
function named(a: number): number { return a + 1; }
const arrow = (n: number) => n;
console.log(typeof named.toString(), named.toString().includes("named"));
console.log(arrow.toString().startsWith("(n"), String(named) === named.toString());
`,
  },
  {
    id: "promise-then-value-and-throw",
    title: "then 回调的返回值 / 抛错两条路",
    src: `
Promise.resolve(1)
  .then((v) => { console.log("got", v); return v + 1; })
  .then((v) => { console.log("next", v); throw new Error("mid"); })
  .catch((e) => console.log("caught", e.message))
  .then(() => console.log("after"));
`,
  },

  // ============ 第 287 轮加宽（标准库：Array / String / Object / Math / Number / JSON / Map / Set / Symbol / Date / Error / Promise / console / 全局） ============
  {
    id: "array-from-mapfn-and-sources",
    title: "Array.from：映射函数 / 字符串 / Set / Map / 长度对象",
    src: `
console.log(Array.from([1, 2], (v) => v * 2).join(","));
console.log(Array.from("abc").join("-"), Array.from("abc").length);
console.log(Array.from(new Set([1, 2, 2])).join(","));
console.log(JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(Array.from({ length: 3 }, (_: any, i: number) => i).join(","));
`,
  },
  {
    id: "array-fill-and-copywithin-negative",
    title: "fill / copyWithin 的负下标与越界",
    src: `
console.log([1, 2, 3, 4].fill(0, -2).join(","));
console.log([1, 2, 3, 4].fill(9, 1, -1).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(-2, 0).join(","));
`,
  },
  {
    id: "array-sort-default-lexicographic",
    title: "sort 不给比较器：按文本、undefined 排尾、返回原数组",
    src: `
const xs = [10, 9, 100, 1];
const back = xs.sort();
console.log(xs.join(","), back === xs);
const ys: any[] = ["b", undefined, "a", "c"];
console.log(ys.sort().join("|"));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
`,
  },
  {
    id: "array-concat-and-nested-flat",
    title: "concat 的多实参与嵌套、flat 的两档",
    src: `
console.log([1].concat([2, 3], 4, [[5]]).length);
console.log(JSON.stringify([1].concat([2], 3)));
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).length);
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
`,
  },
  {
    id: "array-entries-and-manual-iterator",
    title: "数组的 keys / values / entries 与手写 next() 循环",
    src: `
const xs = ["a", "b"];
console.log([...xs.keys()].join(","), [...xs.values()].join(","));
console.log(JSON.stringify([...xs.entries()]));
const it = xs.entries();
let step = it.next();
while (!step.done) { console.log(step.value[0], step.value[1]); step = it.next(); }
`,
  },
  {
    id: "array-with-and-tosorted-forms",
    title: "with / toSorted / toReversed / toSpliced 形态（不改原数组）",
    src: `
const xs = [1, 2, 3];
console.log(xs.with(1, 9).join(","), xs.join(","));
console.log(xs.with(-1, 8).join(","));
console.log(xs.toSorted((a, b) => b - a).join(","), xs.toReversed().join(","));
`,
  },
  {
    id: "array-indexof-edge-and-lastindexof",
    title: "indexOf / lastIndexOf / includes 的 NaN、undefined 与起始下标",
    src: `
const xs: any[] = [1, undefined, 2, undefined];
console.log(xs.indexOf(undefined), xs.lastIndexOf(undefined), xs.indexOf(undefined, 2));
console.log([NaN].includes(NaN), [NaN].indexOf(NaN), [NaN].lastIndexOf(NaN));
console.log([1, 2, 1].lastIndexOf(1, 1), [1, 2, 1].indexOf(1, -1));
`,
  },
  {
    id: "array-splice-forms",
    title: "splice：只删 / 只插 / 替换 / 负起点 / 越界",
    src: `
const a = [1, 2, 3, 4];
console.log(a.splice(1, 1).join(","), a.join(","));
const b = [1, 2, 3, 4];
console.log(b.splice(1, 0, "x").length, b.join(","));
const c = [1, 2, 3];
console.log(c.splice(-2, 5).join(","), c.join(","));
`,
  },
  {
    id: "array-tostring-and-join-holes",
    title: "toString 与 join 在洞 / null / undefined / 嵌套上的口径",
    src: `
const xs: any[] = [1, null, undefined, , 5];
console.log(xs.toString(), xs.join("-"));
console.log([[1, 2], [3]].toString(), [[1, 2], [3]].join(";"));
console.log([].toString() === "", [1].toString());
`,
  },
  {
    id: "array-reduce-forms-and-empty",
    title: "reduce / reduceRight 的四种形态（含空数组抛错）",
    src: `
console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
console.log(["a", "b", "c"].reduceRight((a, b) => a + b));
console.log([1].reduce((a, b) => a + b), [1].reduce((a, b) => a + b, 100));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log(e.name); }
`,
  },
  {
    id: "array-find-last-and-flatmap",
    title: "findLast / findLastIndex / flatMap 上的空结果与展平",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 9), xs.findLastIndex((v) => v > 9));
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log([1, 2].flatMap((v) => (v > 1 ? [v] : [])).join(","));
`,
  },
  {
    id: "string-split-edge-forms",
    title: "split：空分隔符 / 限制个数 / 空串 / 尾部空",
    src: `
console.log("abc".split("").join("-"));
console.log("a,b,c".split(",", 2).join("|"));
console.log("".split(",").length, "".split("").length);
console.log("a,,b".split(",").map((s) => s.length).join(","));
console.log("aaa".split("aa").join("|"), "x".split("x").length);
`,
  },
  {
    id: "string-slice-substring-substr-family",
    title: "slice / substring / at 在负下标与越界上的三种口径",
    src: `
const s = "abcdef";
console.log(s.slice(-2), s.slice(1, -1), s.slice(9), s.slice(4, 1));
console.log(s.substring(4, 1), s.substring(-2, 2));
console.log(s.at(-1), s.at(0), s.at(99), s.at(-99));
`,
  },
  {
    id: "string-indexof-from-and-last",
    title: "indexOf / lastIndexOf / includes / startsWith / endsWith 的起始位",
    src: `
const s = "abcabc";
console.log(s.indexOf("a"), s.indexOf("a", 1), s.indexOf("z"));
console.log(s.lastIndexOf("a"), s.lastIndexOf("a", 3), s.lastIndexOf("z"));
console.log(s.includes("bc", 2), s.startsWith("bc", 1), s.endsWith("ab", 5));
console.log("".includes(""), "".startsWith(""), "abc".endsWith("", 1));
`,
  },
  {
    id: "string-charcodes-and-units",
    title: "charAt / charCodeAt / codePointAt 在越界与代理对上",
    src: `
const s = "A\\u{1F600}B";
console.log(s.length, s.charAt(0), s.charAt(99) === "", s.charCodeAt(0));
console.log(s.codePointAt(1), s.codePointAt(2), s.codePointAt(99));
console.log([...s].length, JSON.stringify([...s]));
console.log(String.fromCodePoint(0x1f600).length, String.fromCharCode(65, 66));
`,
  },
  {
    id: "string-replace-patterns",
    title: "replace / replaceAll：字符串模式、$& 与 $1 一类替换记号、函数替换",
    src: `
console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("abc".replace("b", "[$&]"), "abc".replace("b", "$'" + "|" + "$" + "\`"));
console.log("abc".replace("b", (m: string) => m.toUpperCase()));
console.log("aaa".replaceAll("a", (m: string, i: number) => String(i)).length);
`,
  },
  {
    id: "string-pad-and-repeat-edge-forms",
    title: "padStart / padEnd / repeat 的截断、负数与零次",
    src: `
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2, "0"));
console.log("5".padStart(5, "ab"), "5".padEnd(4));
console.log("ab".repeat(3), "ab".repeat(0), "".repeat(3), "a".repeat(2.9).length);
try { "a".repeat(-1); } catch (e: any) { console.log(e.name); }
`,
  },
  {
    id: "string-concat-and-trim-families",
    title: "concat 的多参 · trim / trimStart / trimEnd 的空白集",
    src: `
console.log("a".concat("b", "c"), "a".concat(1 as any, true as any));
console.log(JSON.stringify(" \\t\\n x \\r\\n ".trim()));
console.log(JSON.stringify("  x  ".trimStart()), JSON.stringify("  x  ".trimEnd()));
console.log("\\u00a0x\\u00a0".trim().length);
`,
  },
  {
    id: "string-raw-and-tagged",
    title: "String.raw 作为标签 + 普通调用两种形态",
    src: `
console.log(String.raw\`a\\nb\`);
console.log(String.raw({ raw: ["x", "y"] }, 1));
console.log(String.raw\`\${1}\\t\${2}\`.length);
`,
  },
  {
    id: "string-case-and-locale",
    title: "大小写与 localeCompare 的确定读数",
    src: `
console.log("aBc".toUpperCase(), "AbC".toLowerCase());
console.log("a".localeCompare("b"), "b".localeCompare("a"), "a".localeCompare("a"));
console.log("abc".toUpperCase().length, "İ".length);
`,
  },
  {
    id: "object-keys-order-numeric-first",
    title: "Object.keys / values / entries 的键序：整数键在前且升序",
    src: `
const o: any = { b: 2, 2: "two", a: 1, 1: "one", 10: "ten" };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(JSON.stringify(Object.entries(o)));
`,
  },
  {
    id: "object-assign-forms-and-order",
    title: "Object.assign：多源、覆盖顺序、返回目标、undefined 源",
    src: `
const target = { a: 1 };
const back = Object.assign(target, { b: 2 }, { a: 3 }, undefined as any);
console.log(back === target, JSON.stringify(target));
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { x: 2, y: 3 })));
console.log(JSON.stringify(Object.assign({}, "ab")));
`,
  },
  {
    id: "object-create-and-prototype-forms",
    title: "Object.create：null 原型 / 带属性 / 继承来的键",
    src: `
const bare = Object.create(null);
bare.x = 1;
console.log(bare.x, Object.getPrototypeOf(bare));
const base = { greet() { return "hi"; } };
const child = Object.create(base, { own: { value: 5, enumerable: true } });
console.log(child.greet(), child.own, Object.keys(child).join(","), "greet" in child);
`,
  },
  {
    id: "object-defineproperty-forms",
    title: "defineProperty：getter / 不可枚举 / 不可写 / 只读现值",
    src: `
const o: any = {};
let store = 1;
Object.defineProperty(o, "g", { get: () => store, enumerable: true });
Object.defineProperty(o, "hidden", { value: 2 });
Object.defineProperty(o, "locked", { value: 3, writable: false, enumerable: true });
store = 7;
console.log(o.g, Object.keys(o).join(","), "hidden" in o);
console.log(JSON.stringify(o.locked), Object.getOwnPropertyNames(o).sort().join(","));
`,
  },
  {
    id: "object-descriptor-flags",
    title: "getOwnPropertyDescriptor 的三套标志（数组元素 / 字符串下标 / length）",
    src: `
const d1 = Object.getOwnPropertyDescriptor([1, 2], "0") as any;
const d2 = Object.getOwnPropertyDescriptor("ab", "0") as any;
const d3 = Object.getOwnPropertyDescriptor([1, 2], "length") as any;
console.log([d1.writable, d1.enumerable, d1.configurable].join(","));
console.log([d2.writable, d2.enumerable, d2.configurable].join(","));
console.log([d3.writable, d3.enumerable, d3.configurable].join(","));
`,
  },
  {
    id: "object-freeze-seal-forms",
    title: "freeze / seal / isFrozen / isSealed 的四格组合",
    src: `
const f = Object.freeze({ a: 1 });
const s = Object.seal({ b: 1 });
console.log(Object.isFrozen(f), Object.isSealed(f), Object.isFrozen(s), Object.isSealed(s));
console.log(Object.isFrozen({}), Object.isSealed({}), Object.isFrozen([1]));
s.b = 2;
console.log(s.b);
`,
  },
  {
    id: "object-tostring-tags",
    title: "Object.prototype.toString 在各类值上的标签",
    src: `
const tag = (v: any) => Object.prototype.toString.call(v);
console.log(tag([]), tag({}), tag(1), tag("s"), tag(true), tag(null), tag(undefined));
console.log(tag(new Map()), tag(new Set()), tag(new Date(0)), tag(() => 0));
`,
  },
  {
    id: "object-hasown-and-in-forms",
    title: "hasOwnProperty / in / getPrototypeOf 在继承链上的分工",
    src: `
class Base { m() { return 1; } }
class Sub extends Base { n() { return 2; } }
const s = new Sub();
console.log(s.hasOwnProperty("n"), s.hasOwnProperty("m"), "m" in s, "z" in s);
console.log(Object.getPrototypeOf(s) === Sub.prototype, Object.getPrototypeOf(Sub.prototype) === Base.prototype);
console.log(Object.getOwnPropertyNames(s).length, Object.keys(s).length);
`,
  },
  {
    id: "object-valueof-override",
    title: "valueOf / toString 参与隐式转换的优先顺序",
    src: `
const a = { valueOf: () => 5, toString: () => "T" };
const b = { toString: () => "T" };
console.log(a as any as number + 1, String(a), \`\${a}\`);
console.log(b + "", \`\${b}\`, String(b));
`,
  },
  {
    id: "math-rounding-boundaries",
    title: "Math.round / floor / ceil / trunc 在 .5 与负数上的口径",
    src: `
console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log(Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5));
console.log(Math.floor(1.5), Math.ceil(1.5), Math.trunc(1.9), Math.trunc(-1.9));
console.log(Math.round(NaN), Math.round(Infinity));
`,
  },
  {
    id: "math-sign-and-negzero",
    title: "Math.sign / abs / min / max 在 ±0 与 NaN 上",
    src: `
console.log(Math.sign(-0), 1 / Math.sign(-0), Math.sign(0), Math.sign(-3), Math.sign(NaN));
console.log(1 / Math.abs(-0), 1 / Math.abs(0));
console.log(Math.min(0, -0), 1 / Math.min(0, -0), Math.max(-0, 0), 1 / Math.max(-0, 0));
console.log(Math.min(), Math.max(), Math.min(NaN, 1), Math.max(NaN, 1));
`,
  },
  {
    id: "math-pow-and-roots-edge",
    title: "Math.pow / sqrt / cbrt / hypot 的边界",
    src: `
console.log(Math.pow(2, 10), Math.pow(2, 0.5), Math.pow(-8, 1 / 3), Math.pow(0, 0));
console.log(Math.sqrt(9), Math.sqrt(-1) !== Math.sqrt(-1), Math.sqrt(0));
console.log(Math.cbrt(-27), Math.cbrt(8), Math.hypot(3, 4), Math.hypot());
`,
  },
  {
    id: "math-logs-and-exp",
    title: "Math.log / log2 / log10 / exp / log1p / expm1 的读数",
    src: `
console.log(Math.log(1), Math.log(0), Math.log(-1) !== Math.log(-1));
console.log(Math.log2(8), Math.log10(1000), Math.log1p(0));
console.log(Math.exp(0), Math.expm1(0), Math.exp(1) > 2.7 && Math.exp(1) < 2.72);
`,
  },
  {
    id: "math-trig-and-hyperbolic",
    title: "三角与双曲：sin / cos / tan / atan2 / sinh 的确定读数",
    src: `
console.log(Math.sin(0), Math.cos(0), Math.tan(0), Math.sin(Math.PI / 2));
console.log(Math.atan2(0, 1), Math.atan2(1, 0), Math.asin(0), Math.acos(1));
console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.sinh(1) > 1.17);
`,
  },
  {
    id: "math-imul-clz32-fround",
    title: "Math.imul / clz32 / fround 的整数口径",
    src: `
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0xffffffff, 5));
console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));
`,
  },
  {
    id: "number-static-family",
    title: "Number.isInteger / isSafeInteger / isFinite / isNaN 与全局那两个的分工",
    src: `
console.log(Number.isInteger(1), Number.isInteger(1.5), Number.isInteger("1"));
console.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53));
console.log(Number.isFinite("1"), isFinite("1" as any), Number.isNaN("x"), isNaN("x" as any));
`,
  },
  {
    id: "number-constants-and-valueof",
    title: "Number 的常量与字面量的 valueOf / toString",
    src: `
console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.POSITIVE_INFINITY);
console.log((255).valueOf(), (255).toString(), (255).toString(16), (255).toString(2));
`,
  },
  {
    id: "number-tofixed-and-toprecision-forms",
    title: "toFixed / toPrecision 在进位、负数、很大很小上的读数",
    src: `
console.log((1.005).toFixed(2), (2.5).toFixed(0), (-2.5).toFixed(0), (0).toFixed(2));
console.log((1234.5678).toFixed(1), (0.000001).toFixed(7), (1e21).toFixed(2));
console.log((123.456).toPrecision(4), (0.000123).toPrecision(2), (1).toPrecision(3));
`,
  },
  {
    id: "number-tostring-radix-edge-forms",
    title: "toString(radix) 在 2 / 8 / 16 / 36 与负数、小数上",
    src: `
console.log((255).toString(16), (255).toString(2), (255).toString(8), (35).toString(36));
console.log((-255).toString(16), (0).toString(2), (0.5).toString(2));
try { (1).toString(1); } catch (e: any) { console.log(e.name); }
`,
  },
  {
    id: "number-parse-and-failure-forms",
    title: "parseInt / parseFloat / Number() 的截断点与失败形态",
    src: `
console.log(parseInt("42px"), parseInt("  12  "), parseInt("0x1f"), parseInt("1f", 16));
console.log(parseInt("2", 2), parseInt("z", 36), parseInt("x"), parseInt(""));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e3"), Number(""), Number(" 7 "), Number("x"));
`,
  },
  {
    id: "json-stringify-replacer-array-and-fn",
    title: "JSON.stringify 的 replacer：数组白名单与函数改写",
    src: `
const o = { a: 1, b: 2, c: 3 };
console.log(JSON.stringify(o, ["a", "c"]));
console.log(JSON.stringify(o, (k: string, v: any) => (k === "b" ? undefined : v)));
console.log(JSON.stringify({ x: { y: 1 } }, (k: string, v: any) => (k === "y" ? 9 : v)));
`,
  },
  {
    id: "json-stringify-tojson-and-specials",
    title: "JSON.stringify 的 toJSON / undefined / 函数 / NaN 口径",
    src: `
const withToJson = { a: 1, toJSON() { return { replaced: true }; } };
console.log(JSON.stringify(withToJson));
console.log(JSON.stringify({ u: undefined, f: () => 0, n: NaN, i: Infinity }));
console.log(JSON.stringify([undefined, () => 0, NaN]), JSON.stringify(undefined), JSON.stringify(null));
`,
  },
  {
    id: "json-parse-forms",
    title: "JSON.parse 的空白 / 转义 / 数字 / 嵌套 / 错误",
    src: `
const v: any = JSON.parse('  { "a" : [1, 2.5, -3e2], "b" : "x\\\\ny", "c" : null }  ');
console.log(v.a.join(","), v.b.length, v.b[1], v.c, v.a[2]);
try { JSON.parse("{oops}"); } catch (e: any) { console.log(e.name); }
try { JSON.parse(""); } catch (e: any) { console.log(e.name); }
`,
  },
  {
    id: "json-parse-reviver-forms",
    title: "JSON.parse 的 reviver：自底向上、改名、删键",
    src: `
const order: string[] = [];
const out: any = JSON.parse('{"a":{"b":1},"c":2}', (k: string, v: any) => { order.push(k); return typeof v === "number" ? v * 10 : v; });
console.log(order.join(","), out.a.b, out.c);
const dropped: any = JSON.parse('{"keep":1,"drop":2}', (k: string, v: any) => (k === "drop" ? undefined : v));
console.log(JSON.stringify(dropped));
`,
  },
  {
    id: "map-methods-and-size",
    title: "Map：size / has / get / delete / clear 与缺失键",
    src: `
const m = new Map<string, number>();
console.log(m.size, m.get("x"), m.has("x"), m.delete("x"));
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.delete("a"), m.size);
m.clear();
console.log(m.size, m.get("b"));
`,
  },
  {
    id: "map-object-and-nan-keys",
    title: "Map 的键：对象按引用、NaN 与 -0 / 0 同一格",
    src: `
const o = { k: 1 };
const m = new Map<any, string>();
m.set(o, "obj").set(NaN, "nan").set(0, "zero");
console.log(m.get(o), m.get({ k: 1 }), m.get(NaN), m.get(-0), m.size);
`,
  },
  {
    id: "map-iteration-and-foreach",
    title: "Map 的迭代顺序、forEach 三个实参、展开",
    src: `
const m = new Map([["b", 2], ["a", 1]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log(JSON.stringify([...m]));
m.forEach((v, k, self) => console.log(k, v, self.size, self === m));
`,
  },
  {
    id: "set-methods-and-iteration",
    title: "Set：add / has / delete / size / 迭代 / forEach",
    src: `
const s = new Set<number>();
console.log(s.size, s.has(1), s.delete(1));
s.add(1).add(2).add(2);
console.log(s.size, s.has(2), [...s].join(","));
s.forEach((v, k, self) => console.log(v, k === v, self.size));
console.log(JSON.stringify([...s.entries()]));
`,
  },
  {
    id: "map-set-spread-and-from",
    title: "Map / Set 与数组互转：spread、构造、Array.from",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log(Array.isArray([...m]), [...m].length, [...m][0].length);
console.log([...new Set([1, 1, 2])].join(","), Array.from(new Set("aab")).join(""));
const s = new Set([1, 2]);
console.log(Array.from(s, (v) => v * 2).join(","));
`,
  },
  {
    id: "symbol-description-and-tostring",
    title: "Symbol：description / toString / 唯一性 / 作为键",
    src: `
const a = Symbol("d");
const b = Symbol("d");
console.log(a === b, a.description, String(a), a.toString() === String(a));
const key = Symbol("k");
const o: any = { [key]: 1, plain: 2 };
console.log(o[key], Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length);
`,
  },
  {
    id: "symbol-registry-and-wellknown",
    title: "Symbol.for / keyFor 的注册表与几个内建符号的身份",
    src: `
console.log(Symbol.for("x") === Symbol.for("x"), Symbol.for("x") === Symbol("x"));
console.log(Symbol.keyFor(Symbol.for("y")), Symbol.keyFor(Symbol("y")));
console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, Symbol.iterator === Symbol.iterator);
console.log(typeof Symbol.toPrimitive, typeof Symbol.hasInstance, typeof Symbol.toStringTag);
`,
  },
  {
    id: "symbol-toprimitive-and-concat",
    title: "Symbol.toPrimitive 的三种提示与符号拼接抛错",
    src: `
const o = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : hint === "string" ? "S" : "default"; } };
console.log(o as any as number + 1, \`\${o}\`, String(o));
try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log(e.name); }
`,
  },
  {
    id: "date-getters-and-setters",
    title: "Date：getTime / UTC 取值 / 本地与 UTC 的同一时刻",
    src: `
const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const e = new Date(2020, 0, 2, 3, 4, 5);
console.log(e.getFullYear(), e.getMonth(), e.getDate(), typeof e.getHours());
console.log(new Date(1000).getUTCSeconds(), Date.UTC(1970, 0, 1));
`,
  },
  {
    id: "date-toiso-and-json",
    title: "Date：toISOString / toJSON / JSON.stringify 里的日期",
    src: `
const d = new Date(0);
console.log(d.toISOString(), d.toJSON(), JSON.stringify({ at: d }));
console.log(new Date(1600000000000).toISOString());
console.log(JSON.stringify([d]), JSON.parse(JSON.stringify(d)));
`,
  },
  {
    id: "date-utc-setters-roundtrip",
    title: "Date：setUTC* 七个格子与往返一致",
    src: `
const d = new Date(0);
d.setUTCFullYear(2000);
d.setUTCMonth(5);
d.setUTCDate(15);
d.setUTCHours(12, 30, 45, 500);
console.log(d.toISOString());
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
console.log(new Date(d.getTime()).toISOString() === d.toISOString());
`,
  },
  {
    id: "error-family-and-cause",
    title: "错误家族：四类 + cause + instanceof 的层级",
    src: `
const e = new TypeError("t");
const s = new SyntaxError("s");
const r = new RangeError("r");
const c = new Error("outer", { cause: new Error("inner") });
console.log(e instanceof Error, e instanceof TypeError, s.name, r.name);
console.log(c.message, c.cause.message, c.cause instanceof Error);
console.log(Object.prototype.toString.call(e), e.toString(), s.toString());
`,
  },
  {
    id: "promise-combinators-forms",
    title: "Promise.all / race / resolve / reject 的结清顺序",
    src: `
Promise.all([Promise.resolve(1), 2, Promise.resolve(3)]).then((xs) => console.log("all", xs.join(",")));
Promise.all([]).then((xs) => console.log("empty", xs.length));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
Promise.resolve("r").then((v) => console.log("resolve", v));
Promise.reject(new Error("nope")).catch((e: any) => console.log("reject", e.message));
`,
  },
  {
    id: "promise-then-return-forms",
    title: "then 的返回值：值 / 承诺 / 抛出 三条路各自的下一环",
    src: `
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => Promise.resolve(v * 10))
  .then((v) => { throw new Error("mid"); })
  .catch((e: any) => "caught:" + e.message)
  .then((v) => console.log(v));
Promise.resolve(2).finally(() => console.log("finally")).then((v) => console.log("kept", v));
`,
  },
  {
    id: "console-log-container-shapes",
    title: "console.log 容器形状：嵌套数组 / 对象 / Map / Set / 多参",
    src: `
console.log([1, [2, 3]], { a: { b: 1 } });
console.log(new Map([["k", 1]]), new Set([1, 2]));
console.log("a", 1, true, null, undefined, [1]);
console.log([], {}, [], [{}]);
`,
  },
  {
    id: "console-log-string-forms",
    title: "console.log 字符串与数字的形状：引号、转义、负数、指数",
    src: `
console.log("plain", "with space", "with'quote", 'with"double');
console.log("a\\nb", "tab\\there");
console.log(1, -1, 0, -0, 1.5, 1e21, 1e-7, NaN, Infinity);
`,
  },
  {
    id: "global-explicit-and-implicit",
    title: "全局函数与隐式转换：Boolean / Number / String / Array / Object",
    src: `
console.log(Boolean(0), Boolean(""), Boolean([]), Boolean({}), Boolean(NaN));
console.log(Number(true), Number(null), Number(undefined) !== Number(undefined), Number(" 12 "));
console.log(String(1), String(null), String(undefined), String([1, 2]));
console.log(Array(3).length, Array(1, 2).length, Object(1).valueOf());
`,
  },
  {
    id: "function-prototype-and-bind-forms",
    title: "Function.prototype：call / apply / bind 的 this 与实参形态",
    src: `
function f(this: any, a: number, b: number) { return this.base + a + b; }
const obj = { base: 10 };
console.log(f.call(obj, 1, 2), f.apply(obj, [3, 4]));
const bound = f.bind(obj, 5);
console.log(bound(6), bound.length, typeof bound);
class C { v: number; constructor(v: number) { this.v = v; } get() { return this.v; } }
const g = new C(1).get;
console.log(g.call(new C(9)));
`,
  },
];
