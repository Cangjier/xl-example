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
];
