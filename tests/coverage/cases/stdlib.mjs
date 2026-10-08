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
    title: "console.log 遇上 Map / Set / Error 的第一行 / 符号",
    // **第 370 轮：把「栈」那一档拆出去了** ✓——这一条只管**引擎自己拥有的**那部分 ✓：
    // `Map` / `Set` 的字面形状 ✓、`Error` 的**第一行** ✓（`Error: boom` ✓）、符号的 `Symbol(s)` ✓。
    // 原来这里打的是**整个错误对象** ✓ ⇒ 输出里带上了一整段**栈** ✗，
    // 而那段栈里**大部分帧是宿主自己的**（`Module._compile` 那些 ✓）——
    // 这一条因此**永远不可能**逐字对上 ✓（第 217 轮的定性 ✓）。栈那一档现在住在
    // `console-log-error-stack` 那一条里 ✓，它按**口径外**登记 ✓（看得见、不算进分母 ✓）。
    src: `
console.log(new Map([["a", 1]]));
console.log(new Set([1, 2]));
console.log("Error: " + new Error("boom").message);
console.log(Symbol("s"));
`,
  },
  {
    id: "console-log-error-stack",
    title: "console.log(一个错误对象)：栈里带宿主的内部帧",
    // **口径外** ✓（第 370 轮 ✓，定性见第 217 轮 ✓）：这一段比的是**宿主**的实现细节 ✗——
    // Node 打出来的栈除了用户那一帧 ✓，还有 `Module._compile` / `Module.load` 那一整串
    // **V8 / 装载器内部帧** ✓，而它们的**行号随宿主版本变** ✗（本机是 `loader:1929:14` ✓）。
    // 让本仓去逐字复现另一个运行时的内部帧，既做不到、也没有意义 ✓——
    // 引擎**自己**该拥有的那部分（`Error: boom` 这一行 ✓）由上面那一条量着 ✓。
    // **留在矩阵里看得见** ✓、**不算进分母** ✓（与 `regexp-literal-basic` 那几条同一个口径 ✓）。
    skip: "口径外：Node 的栈里含宿主/V8 内部帧（行号随宿主版本变），逐字复现不在本工程的目标里；引擎自己的 Error 首行由 console-log-special 量着",
    src: `
console.log(new Error("boom"));
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

  {
    id: "array-tolocalestring",
    title: "Array.toLocaleString 与 toString 的差别",
    src: `
console.log([1, 2, 3].toLocaleString(), [].toLocaleString(), [1, [2, 3]].toLocaleString());
`,
  },
  {
    id: "string-normalize",
    title: "String.normalize：NFC 把组合字符合成一个",
    src: `
const s = "e\\u0301";
console.log(s.length, s.normalize("NFC").length, s.normalize("NFC") === "\\u00e9");
`,
  },
  {
    id: "string-replace-function-form",
    title: "replace 的替换值是函数",
    src: `
console.log("abc".replace("b", (m) => m.toUpperCase()));
console.log("a-b-c".replace("-", (m, i) => "<" + i + ">"));
`,
  },
  {
    id: "string-replace-dollar-forms",
    title: "replace 的 $& / $` / $' 替换记号",
    src: `
console.log("abc".replace("b", "[$&]"));
console.log("abc".replace("b", "[$']"));
console.log("abc".replace("b", "$1"), "abc".replace("b", "$$"));
`,
  },
  {
    id: "regexp-literal-basic",
    title: "正则字面量与 exec / test",
    src: `
const re = /a(b+)c/;
const m = re.exec("xabbc");
console.log(m ? m[0] + "|" + m[1] : "none", /z/.test("abc"));
`,
    skip: "口径外：`RegExp` 是 v1 写死的非目标（docs/runtime-architecture.md §15）——留在矩阵里看得见，不算进分母",
  },
  {
    id: "string-match-and-split-regex",
    title: "字符串方法收正则：match / split(/\\s+/)",
    src: `
console.log("a1b2".match(/\\d/g)?.join(","));
console.log("a  b   c".split(/\\s+/).join("|"));
`,
    skip: "口径外：同上——收正则的那几个字符串方法要 `RegExp`，它不在目标里",
  },
  {
    id: "object-getownpropertydescriptors",
    title: "Object.getOwnPropertyDescriptors（复数）",
    src: `
const o = { a: 1 };
const d = Object.getOwnPropertyDescriptors(o);
console.log(d.a.value, d.a.writable, d.a.enumerable, d.a.configurable);
`,
  },
  {
    id: "object-create-with-properties",
    title: "Object.create 带第二格属性描述表",
    src: `
const proto = { greet: () => "hi" };
const o = Object.create(proto, { a: { value: 1, enumerable: true } });
console.log(o.greet(), o.a, Object.keys(o).join(","));
`,
  },
  {
    id: "object-getownpropertydescriptors-symbols",
    title: "Object.getOwnPropertySymbols 与 keys 的分工",
    src: `
const s = Symbol("s");
const o = { a: 1, [s]: 2 };
console.log(Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length, Object.getOwnPropertyNames(o).join(","));
`,
  },
  {
    id: "function-name-inference",
    title: "函数的 name：声明 / 表达式 / 推断 / 方法",
    src: `
function decl() {}
const f = function () {};
const g = () => {};
const o = { m() {} };
const arr = [function () {}];
console.log(decl.name, f.name, g.name, o.m.name, arr[0].name);
`,
  },
  {
    id: "function-length-with-defaults",
    title: "函数的 length：默认值与剩余形参都不算",
    src: `
function a(x: number, y: number) {}
function b(x: number, y = 1) {}
function c(x: number, ...r: number[]) {}
console.log(a.length, b.length, c.length);
`,
  },
  {
    id: "object-freeze-shallow",
    title: "Object.freeze 是浅的：内层照样能改",
    src: `
const o = Object.freeze({ a: { b: 1 } });
o.a.b = 2;
console.log(o.a.b, Object.isFrozen(o), Object.isFrozen(o.a));
`,
  },
  {
    id: "array-tostring-custom-values",
    title: "数组 toString 走元素的 toString",
    src: `
class C {
  toString() {
    return "C!";
  }
}
console.log([new C(), 1].toString());
`,
  },
  {
    id: "array-reduce-empty-throws",
    title: "空数组 reduce 不给初值：抛 TypeError",
    src: `
try {
  [].reduce((a: number, b: number) => a + b);
} catch (e) {
  console.log((e as Error).name);
}
console.log([].reduce((a: number, b: number) => a + b, 10));
`,
  },
  {
    id: "array-flat-deep-levels",
    title: "flat 的深度：2 与 Infinity",
    src: `
const xs = [1, [2, [3, [4]]]];
console.log(xs.flat(2).join(","), xs.flat(Infinity).join(","), xs.flat(0).length);
`,
  },
  {
    id: "string-at-negative-and-beyond",
    title: "String.at：负下标与越界",
    src: `
console.log("abc".at(-1), "abc".at(0), "abc".at(5), "abc".at(-5));
`,
  },
  {
    id: "math-cbrt-trunc-sign",
    title: "Math.cbrt / trunc / sign / log2 的组合",
    src: `
console.log(Math.cbrt(27), Math.cbrt(-8), Math.trunc(-1.7), Math.sign(-3), Math.log2(8), Math.log10(1000));
`,
  },
  {
    id: "number-constants-and-limits",
    title: "Number 的常量：EPSILON / MAX_SAFE_INTEGER / MIN_VALUE",
    src: `
console.log(Number.EPSILON, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, Number.MAX_VALUE);
`,
  },
  {
    id: "number-tostring-edge-values",
    title: "数字转字符串的边界：1e21 / 1e-7 / 极小",
    src: `
console.log((1e21).toString(), (1e-7).toString(), (1e-21).toString(), (0.1).toString());
`,
  },
  {
    id: "parseint-parsefloat-edge",
    title: "parseInt / parseFloat 的边界",
    src: `
console.log(parseInt("0x10"), parseInt("10", 2), parseInt(" 42abc"), parseInt("abc"), parseFloat("3.5e2"), parseFloat(".5"));
`,
  },
  {
    id: "date-multi-arg-ctor",
    title: "new Date(y, m, d, h, mi, s)：多实参构造",
    src: `
const d = new Date(2020, 0, 2, 3, 4, 5);
console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getUTCFullYear());
`,
  },
  {
    id: "date-string-parse",
    title: "Date.parse 与 new Date(字符串)",
    src: `
const ms = Date.parse("1970-01-01T00:00:00.000Z");
console.log(ms, new Date(ms).toISOString(), new Date("1970-01-01T00:00:00.000Z").getTime());
`,
  },
  {
    id: "date-invalid-values",
    title: "无效日期的口径：Invalid Date / NaN / toISOString 抛",
    src: `
const d = new Date(NaN);
console.log(String(d), d.getTime(), Number.isNaN(d.getTime()));
try {
  d.toISOString();
} catch (e) {
  console.log((e as Error).name);
}
`,
  },
  {
    id: "promise-race-any-allsettled",
    title: "Promise.race / any / allSettled",
    src: `
Promise.race([Promise.resolve(1), Promise.resolve(2)]).then((v) => console.log("race", v));
Promise.any([Promise.reject(new Error("x")), Promise.resolve(3)]).then((v) => console.log("any", v));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("y"))]).then((rs) => console.log(rs.map((r) => r.status).join(",")));
`,
  },
  {
    id: "error-aggregate",
    title: "AggregateError：名字、消息、内层数组",
    src: `
const e = new AggregateError([new Error("a")], "many");
console.log(e.name, e.message, e.errors.length, e instanceof Error);
`,
  },
  {
    id: "weakmap-basic",
    title: "WeakMap：set / get / has / delete",
    src: `
const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k));
`,
  },
  {
    id: "object-groupby",
    title: "Object.groupBy 分组",
    src: `
const g = Object.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"));
console.log(g.odd!.join(","), g.even!.join(","));
`,
  },
  {
    id: "json-stringify-space-forms",
    title: "JSON.stringify 的第三格：数字与字符串缩进",
    src: `
console.log(JSON.stringify({ a: 1, b: [2, 3] }, null, 2));
console.log(JSON.stringify([1, { c: 2 }], null, "\\t"));
`,
  },
  {
    id: "map-entries-to-array-forms",
    title: "Map 与 Object.entries / Array.from 互转",
    src: `
const m = new Map(Object.entries({ a: 1, b: 2 }));
console.log([...m.keys()].join(","), m.get("b"));
console.log(Array.from(new Map([[1, "x"], [2, "y"]]), ([k, v]) => k + v).join(","));
`,
  },
  {
    id: "set-operations-forms",
    title: "Set 与数组互转、去重、size 与 delete",
    src: `
const s = new Set([1, 1, 2, 3]);
console.log(s.size, [...s].join(","), s.delete(2), s.has(2));
console.log([...new Set("aabbc")].join(""));
`,
  },
  {
    id: "string-padstart-forms",
    title: "padStart / padEnd 的各种实参形态",
    src: `
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2), "x".padStart(4, "ab"));
`,
  },
  {
    id: "global-functions-forms",
    title: "全局函数：isNaN / isFinite / Boolean / String / Number",
    src: `
console.log(isNaN("x"), Number.isNaN("x"), isFinite("3"), Number.isFinite("3"));
console.log(Boolean(""), Boolean("a"), String(null), Number(""), Number(" 7 "));
`,
  },
  {
    id: "symbol-tostring-and-primitive",
    title: "Symbol 的 description / toString / String()",
    src: `
const s = Symbol("desc");
console.log(s.description, s.toString(), String(s), typeof s);
console.log(Symbol().description);
`,
  },
  {
    id: "console-log-nested-empty",
    title: "console.log 的容器形状：空数组、空对象、嵌套",
    src: `
console.log([]);
console.log({});
console.log([[]]);
console.log({ a: {} });
console.log([1, [2, [3]]]);
`,
  },
  // ===== 第 291 轮加宽：exec / runtime / 标准库 三层一起铺 =====
  {
    id: "c291-array-iterator-protocol-manual",
    title: "手写迭代协议：next() 的三段返回形状",
    src: `
const xs = [10, 20];
const it = xs[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
`,
  },
  {
    id: "c291-array-from-length-and-mapfn",
    title: "Array.from 的三种源：数组式对象 / 字符串 / 可迭代",
    src: `
console.log(Array.from({ length: 3 }, (_v, i) => i * 2).join(","));
console.log(Array.from("abc").join("-"));
console.log(Array.from(new Set([1, 1, 2])).join(","));
`,
  },
  {
    id: "c291-array-from-map-entries",
    title: "Array.from 直接吃 Map（配 mapfn）",
    src: `
const m = new Map([[1, "a"], [2, "b"]]);
console.log(Array.from(m, (pair) => pair[0] + pair[1]).join(","));
console.log(Array.from(m.keys()).join(","), Array.from(m.values()).join(","));
`,
  },
  {
    id: "c291-array-sort-stability-and-default",
    title: "sort：默认字典序与比较器的稳定性",
    src: `
const rows = [{ k: 1, n: "a" }, { k: 1, n: "b" }, { k: 0, n: "c" }];
rows.sort((x, y) => x.k - y.k);
console.log(rows.map((r) => r.n).join(","));
console.log([10, 9, 1].sort().join(","), [10, 9, 1].sort((a, b) => a - b).join(","));
`,
  },
  {
    id: "c291-array-flat-deep-and-infinity",
    title: "flat：深度参数与 Infinity、洞的处置",
    src: `
console.log([1, [2, [3, [4]]]].flat(1).join(","));
console.log([1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, , 2].flat().length);
`,
  },
  {
    id: "c291-array-reduce-with-and-without-initial",
    title: "reduce：带初值 / 不带初值 / reduceRight",
    src: `
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, "seed"));
console.log([1, 2].reduceRight((a, b) => a + "-" + b));
`,
  },
  {
    id: "c291-array-fill-and-copywithin-negative",
    title: "fill / copyWithin 的负下标",
    src: `
const a = [1, 2, 3, 4];
console.log(a.fill(0, 1, 3).join(","));
console.log([1, 2, 3, 4].fill(9, -2).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(1, -2).join(","));
`,
  },
  {
    id: "c291-array-find-family-values",
    title: "find / findIndex / findLast / findLastIndex 的没找到那一路",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.find((v) => v > 2), xs.findIndex((v) => v > 2));
console.log(xs.findLast((v) => v < 4), xs.findLastIndex((v) => v < 4));
console.log(xs.find((v) => v > 9), xs.findIndex((v) => v > 9));
`,
  },
  {
    id: "c291-array-every-some-shortcircuit",
    title: "every / some 的短路：回调次数就是判据",
    src: `
let n = 0;
const xs = [1, 2, 3];
console.log(xs.every((v) => { n++; return v < 3; }), n);
n = 0;
console.log(xs.some((v) => { n++; return v > 1; }), n);
`,
  },
  {
    id: "c291-array-includes-fromindex-forms",
    title: "includes / lastIndexOf 的起始下标（含负数）",
    src: `
const xs = [1, 2, 3, 2];
console.log(xs.includes(2, 2), xs.includes(1, -3), xs.includes(1, 1));
console.log(xs.lastIndexOf(2), xs.lastIndexOf(2, -2), xs.lastIndexOf(9));
`,
  },
  {
    id: "c291-array-length-shrink-and-grow",
    title: "length 的写：截断、回填成洞、越界赋值",
    src: `
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.length, xs[3], xs.join(","));
xs[9] = "x";
console.log(xs.length, xs.join(","));
`,
  },
  {
    id: "c291-array-tostring-and-join-holes",
    title: "toString / String() / join 对洞与 null 的处置",
    src: `
console.log([1, null, undefined, 2].toString());
console.log(String([1, [2, [3]]]));
console.log([, , 1].join("-"));
`,
  },
  {
    id: "c291-array-keys-entries-manual",
    title: "keys / values / entries 三个迭代器",
    src: `
const xs = ["a", "b"];
console.log([...xs.keys()].join(","), [...xs.values()].join(","));
for (const [i, v] of xs.entries()) console.log(i, v);
`,
  },
  {
    id: "c291-array-concat-and-spread-forms",
    title: "concat 的展平一层与 spread 的对照",
    src: `
const a = [1, 2];
console.log(a.concat([3, 4], 5).join(","));
console.log([...a, ...[3]].join(","));
console.log(a.concat([[6]]).length, a.length);
`,
  },
  {
    id: "c291-string-split-limit-and-empty",
    title: "split：limit、空串源、空串分隔",
    src: `
console.log("a,b,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "".split(",").length, "a".split("").length);
`,
  },
  {
    id: "c291-string-repeat-and-pad-edges",
    title: "repeat / padStart / padEnd 的边界实参",
    src: `
console.log("ab".repeat(0).length, "ab".repeat(1), "ab".repeat(3));
console.log("x".padStart(3, "ab"), "x".padEnd(3, "ab"));
console.log("abc".padStart(2), "abc".padEnd(2, "z"));
`,
  },
  {
    id: "c291-string-at-codepoint-forms",
    title: "码元与码点：at / codePointAt / fromCodePoint",
    src: `
const s = "a😀b";
console.log(s.length, s.codePointAt(1), s.charAt(1).length);
console.log(s.at(0), s.at(-1), s.at(10));
console.log(String.fromCodePoint(97, 128512));
`,
  },
  {
    id: "c291-string-slice-substring-substr",
    title: "slice / substring / substr 三种切法",
    src: `
const s = "abcdef";
console.log(s.slice(1, 3), s.slice(-2), s.slice(3, 1));
console.log(s.substring(3, 1), s.substring(-2));
console.log(s.substr(1, 2), s.substr(-2));
`,
  },
  {
    id: "c291-string-search-positions",
    title: "indexOf / lastIndexOf / includes / startsWith / endsWith 带位置",
    src: `
const s = "ababab";
console.log(s.indexOf("ab", 1), s.lastIndexOf("ab"), s.lastIndexOf("ab", 3));
console.log(s.includes("ba", 2), s.startsWith("ab", 2), s.endsWith("ab", 4));
console.log(s.indexOf("z"), s.indexOf(""));
`,
  },
  {
    id: "c291-string-case-and-localecompare",
    title: "大小写与 localeCompare（只要求符号与零判定）",
    src: `
console.log("AbC".toLowerCase(), "AbC".toUpperCase());
console.log("abc".localeCompare("abd"), "abc".localeCompare("abc"));
console.log("a".localeCompare("a") === 0, "b".localeCompare("a") > 0);
`,
  },
  {
    id: "c291-string-normalize-ascii",
    title: "normalize：ASCII 上原样、组合字符上合一",
    src: `
console.log("abc".normalize("NFC"), "e\\u0301".normalize("NFC").length, "e\\u0301".length);
`,
  },
  {
    id: "c291-string-replace-and-replaceall",
    title: "replace / replaceAll 的字符串形态",
    src: `
console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("aaa".replaceAll("aa", "b"));
console.log("abc".replace("z", "y"));
`,
  },
  {
    id: "c291-string-concat-method-forms",
    title: "字符串的 + 与 concat：转换表",
    src: `
console.log("a" + 1 + true, 1 + 2 + "x", "a" + null + undefined);
console.log(String(1), String(null), String(undefined), String(true));
console.log("x".concat("y", "z", 1));
`,
  },
  {
    id: "c291-string-charat-and-index",
    title: "charAt / charCodeAt 越界与下标读",
    src: `
const s = "ab";
console.log(s.charAt(5), s.charCodeAt(5), s.charCodeAt(0));
console.log(s[0], s[5], s[1]);
`,
  },
  {
    id: "c291-string-trim-forms",
    title: "trim / trimStart / trimEnd",
    src: `
console.log("  x  ".trim(), "|" + "  x  ".trimStart() + "|", "|" + "  x  ".trimEnd() + "|");
console.log("\\t\\n x \\t".trim(), "".trim().length);
`,
  },
  {
    id: "c291-number-constructor-conversions",
    title: "Number() 与 Number(string) 的转换表",
    src: `
console.log(Number(), Number(""), Number(" 12 "), Number("0x10"), Number("1e3"));
console.log(Number(null), Number(undefined), Number(true), Number([]), Number([7]), Number([1, 2]));
`,
  },
  {
    id: "c291-parseint-parsefloat-forms",
    title: "parseInt / parseFloat 与 Number.parseInt 一族",
    src: `
console.log(parseInt("12px"), parseInt("0x1f"), parseInt("1f", 16), parseInt("  08"), parseInt("z"));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e2"), parseFloat("x"));
console.log(Number.parseInt("42"), Number.parseFloat("4.5"));
`,
  },
  {
    id: "c291-number-tostring-radix-and-format",
    title: "toString(radix) / toFixed / toPrecision / toExponential",
    src: `
console.log((255).toString(16), (255).toString(2), (8).toString(8));
console.log((1.005).toFixed(2), (2.5).toFixed(0), (1.45).toFixed(1));
console.log((1234.5678).toPrecision(3), (0.000123).toExponential(2));
`,
  },
  {
    id: "c291-number-static-and-limits",
    title: "Number.isInteger / isSafeInteger / isNaN / isFinite 与三个常量",
    src: `
console.log(Number.isInteger(5), Number.isInteger(5.5), Number.isSafeInteger(2 ** 53), Number.isSafeInteger(2 ** 53 - 1));
console.log(Number.isNaN(NaN), Number.isNaN("x"), Number.isFinite(1), Number.isFinite(Infinity));
console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE > 0);
`,
  },
  {
    id: "c291-number-wrapper-and-negative-zero",
    title: "Number 包装对象与 -0 的两条路",
    src: `
const n = new Number(5);
console.log(typeof n, n.valueOf(), n + 1, Number(n));
console.log(Object.is(-0, -0), Object.is(-0, 0), 1 / -0, String(-0));
`,
  },
  {
    id: "c291-math-more-members",
    title: "Math 的 fround / clz32 / cbrt / trunc / sign / 对数族",
    src: `
console.log(Math.fround(1.5), Math.clz32(1), Math.cbrt(27), Math.trunc(-1.5), Math.sign(-0));
console.log(Math.log2(8), Math.log10(1000), Math.log1p(0), Math.expm1(0));
console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.atan2(1, 1));
`,
  },
  {
    id: "c291-math-round-and-minmax-edges",
    title: "Math.round 的 .5 与 min / max 的空实参、字符串、±0",
    src: `
console.log(Math.round(2.5), Math.round(-2.5), Math.round(0.5));
console.log(Math.min(), Math.max(), Math.min("2", 1), Math.max(-0, 0), Math.min(-0, 0));
console.log(Math.hypot(3, 4), Math.hypot());
`,
  },
  {
    id: "c291-math-constants-and-pow",
    title: "Math 的常量与 pow / sqrt / abs 的边界",
    src: `
console.log(Math.PI > 3.14, Math.E > 2.7, Math.LN2 > 0.69, Math.SQRT2 > 1.41);
console.log(Math.pow(2, 10), 2 ** 10, Number.isNaN(Math.sqrt(-1)), Math.abs(-3));
`,
  },
  {
    id: "c291-object-keys-on-non-objects",
    title: "Object.keys 吃数组 / 字符串，键的整数优先序",
    src: `
console.log(Object.keys([1, 2]).join(","), Object.keys("ab").join(","));
console.log(Object.values({ a: 1, b: 2 }).join(","), Object.entries({ a: 1 })[0].join(":"));
console.log(Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }).join(","));
`,
  },
  {
    id: "c291-object-assign-and-spread",
    title: "Object.assign 与对象展开：覆盖与浅拷贝",
    src: `
const target = { a: 1 };
console.log(JSON.stringify(Object.assign(target, { b: 2 }, { a: 9 })));
const src = { x: { y: 1 } };
const copy = { ...src };
console.log(copy.x === src.x, JSON.stringify({ ...src, z: 3 }));
`,
  },
  {
    id: "c291-object-create-and-prototype",
    title: "Object.create 的继承读，与自有 / 继承两种判据",
    src: `
const proto = { greet() { return "hi"; } };
const o: any = Object.create(proto);
o.n = 1;
console.log(o.greet(), o.n, Object.getPrototypeOf(o) === proto);
console.log(Object.keys(o).join(","), "greet" in o, o.hasOwnProperty("greet"));
`,
  },
  {
    id: "c291-object-defineproperty-flags",
    title: "defineProperty 的可枚举标志与描述符读出",
    src: `
const o: any = {};
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
Object.defineProperty(o, "shown", { value: 2, enumerable: true });
console.log(o.hidden, Object.keys(o).join(","));
console.log(Object.getOwnPropertyDescriptor(o, "shown")!.enumerable);
`,
  },
  {
    id: "c291-object-freeze-and-is",
    title: "Object.freeze / isFrozen / isSealed / isExtensible",
    src: `
const o = Object.freeze({ a: 1 });
console.log(Object.isFrozen(o), Object.isSealed(o), Object.isExtensible(o));
console.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is("a", "a"));
const arr = Object.freeze([1, 2]);
console.log(Object.isFrozen(arr), arr.length);
`,
  },
  {
    id: "c291-object-tostring-and-tag",
    title: "Object.prototype.toString 的标签表",
    src: `
console.log(Object.prototype.toString.call([]), Object.prototype.toString.call(null));
console.log(Object.prototype.toString.call(new Map()), Object.prototype.toString.call(() => 1));
const o = { [Symbol.toStringTag]: "Custom" };
console.log(Object.prototype.toString.call(o), String(o));
`,
  },
  {
    id: "c291-object-fromentries-forms",
    title: "Object.fromEntries 吃 Map 与键值对数组",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
console.log(JSON.stringify(Object.fromEntries(m)));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["y", 2]])));
console.log(Object.entries({ a: 1 })[0][1]);
`,
  },
  {
    id: "c291-json-stringify-specials-forms",
    title: "JSON.stringify 对 undefined / 函数 / 符号 / NaN 的处置",
    src: `
console.log(JSON.stringify(undefined), JSON.stringify(null), JSON.stringify([undefined, () => 1, Symbol("s")]));
console.log(JSON.stringify({ a: undefined, b: () => 1, c: 2 }));
console.log(JSON.stringify(NaN), JSON.stringify(Infinity), JSON.stringify(-0));
`,
  },
  {
    id: "c291-json-stringify-nested-and-indent",
    title: "JSON.stringify 的嵌套与缩进",
    src: `
console.log(JSON.stringify({ a: [1, { b: 2 }], c: "x" }));
console.log(JSON.stringify([1, [2, [3]]], null, 1));
`,
  },
  {
    id: "c291-json-parse-basic-forms",
    title: "JSON.parse 的三种顶层形态",
    src: `
const v = JSON.parse('{"a":1,"b":[true,null,"s"]}');
console.log(v.a, v.b.length, v.b[0], v.b[1], v.b[2]);
console.log(JSON.parse("5"), JSON.parse('"x"'), JSON.parse("null"));
`,
  },
  {
    id: "c291-json-parse-reviver-transform",
    title: "JSON.parse 的 reviver：改值与丢键",
    src: `
const v = JSON.parse('{"n":1,"o":{"n":2}}', (k, val) => (typeof val === "number" ? val * 10 : val));
console.log(JSON.stringify(v));
const dropped = JSON.parse('{"a":1,"b":2}', (k, val) => (k === "b" ? undefined : val));
console.log(JSON.stringify(dropped));
`,
  },
  {
    id: "c291-json-roundtrip-structures",
    title: "JSON 往返：形状与嵌套",
    src: `
const src = { n: 1, s: "x", b: true, z: null, arr: [1, [2]], obj: { k: "v" } };
const back = JSON.parse(JSON.stringify(src));
console.log(JSON.stringify(back) === JSON.stringify(src), back.arr[1][0], back.obj.k);
`,
  },
  {
    id: "c291-map-basic-and-size",
    title: "Map 的链式 set 与 size / get / has / delete",
    src: `
const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.has("z"), m.delete("a"), m.size);
console.log(m.get("b"), [...m.keys()].join(","));
`,
  },
  {
    id: "c291-map-foreach-and-iteration",
    title: "Map.forEach 三个实参与 for..of 解构",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
m.forEach((v, k, self) => console.log(k, v, self.size));
for (const [k, v] of m) console.log(k + "=" + v);
console.log([...m.entries()].length, [...m.values()].join(","));
`,
  },
  {
    id: "c291-map-object-and-nan-keys",
    title: "Map 的键：对象按引用、NaN 按 SameValueZero",
    src: `
const m = new Map<any, string>();
const k1 = { id: 1 };
m.set(k1, "obj");
m.set(NaN, "nan");
m.set("1", "str");
console.log(m.get({ id: 1 }), m.get(k1), m.get(NaN), m.get("1"), m.size);
`,
  },
  {
    id: "c291-set-basic-and-clear",
    title: "Set 的去重、delete 与 clear",
    src: `
const s = new Set([1, 2, 2, 3]);
console.log(s.size, s.has(2), s.delete(2), s.size, [...s].join(","));
s.clear();
console.log(s.size, s.has(1));
const t = new Set("aab");
console.log(t.size, [...t].join(""));
`,
  },
  {
    id: "c291-set-foreach-and-spread",
    title: "Set.forEach 的三个实参与展开",
    src: `
const s = new Set([1, 2]);
s.forEach((v, v2, self) => console.log(v, v2, self.size));
console.log([...s].join(","), Array.from(s).join(","));
console.log(new Set([...s, 3]).size);
`,
  },
  {
    id: "c291-weakset-and-weakmap-forms",
    title: "WeakSet / WeakMap 的四个格子",
    src: `
const ws = new WeakSet<object>();
const o = {};
ws.add(o);
console.log(ws.has(o), ws.has({}), ws.delete(o), ws.has(o));
const wm = new WeakMap<object, number>();
wm.set(o, 7);
console.log(wm.get(o), wm.has(o));
`,
  },
  {
    id: "c291-symbol-registry-and-description",
    title: "Symbol 注册表与 description",
    src: `
const a = Symbol("k");
const b = Symbol.for("shared");
console.log(a.description, typeof a, Symbol.keyFor(b), Symbol.keyFor(a));
console.log(Symbol.for("shared") === b, String(a) === "Symbol(k)");
`,
  },
  {
    id: "c291-symbol-wellknown-custom-iterator",
    title: "自定义 Symbol.iterator：可迭代对象与 Object.keys 的对照",
    src: `
const o: any = { [Symbol.iterator]: function* () { yield 1; yield 2; }, normal: 1 };
console.log([...o].join(","), Object.keys(o).join(","));
console.log(typeof Symbol.toPrimitive, typeof Symbol.toStringTag, typeof Symbol.asyncIterator);
`,
  },
  {
    id: "c291-symbol-toprimitive-custom",
    title: "Symbol.toPrimitive 决定三种 hint",
    src: `
const o: any = {
  [Symbol.toPrimitive](hint: string) { return hint === "number" ? 42 : "str"; },
};
console.log(+o, o + "", String(o));
`,
  },
  {
    id: "c291-date-epoch-and-utc-parts",
    title: "Date 的纪元与 UTC 取值",
    src: `
const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
console.log(Date.UTC(1970, 0, 2), new Date(Date.UTC(2000, 0, 1)).getUTCFullYear());
`,
  },
  {
    id: "c291-date-arithmetic-and-compare",
    title: "Date 的数值化：相减、比较、Number()",
    src: `
const a = new Date(1000);
const b = new Date(2000);
console.log(b.getTime() - a.getTime(), a < b, +a, a.getTime() === 1000);
console.log(new Date(1500).getTime(), Number(new Date(500)));
`,
  },
  {
    id: "c291-date-utc-getters-and-setters",
    title: "UTC 的读写一组",
    src: `
const d = new Date(Date.UTC(2020, 5, 15, 10, 30, 45));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
d.setUTCFullYear(2021);
d.setUTCMonth(0);
d.setUTCDate(2);
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
`,
  },
  {
    id: "c291-date-parse-and-iso-roundtrip",
    title: "Date.parse 与 toISOString 的往返",
    src: `
const ms = Date.parse("1970-01-01T00:00:00.000Z");
console.log(ms, new Date(ms).toISOString());
console.log(new Date(86400000).toISOString());
`,
  },
  {
    id: "c291-promise-then-chain-and-throw",
    title: "承诺链：值传递与抛出的接住",
    src: `
Promise.resolve(1).then((v) => v + 1).then((v) => console.log("v", v));
Promise.resolve().then(() => { throw new Error("boom"); }).catch((e) => console.log("caught", e.message));
console.log("sync");
`,
  },
  {
    id: "c291-promise-all-race-settled",
    title: "Promise.all / race / allSettled 三种组合",
    src: `
Promise.all([1, Promise.resolve(2)]).then((xs) => console.log("all", xs.join(",")));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((rs) => console.log("settled", rs.length, rs[0].status, rs[1].status));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
`,
  },
  {
    id: "c291-promise-any-and-finally",
    title: "Promise.any / reject / finally",
    src: `
Promise.any([Promise.reject(new Error("a")), Promise.resolve("b")]).then((v) => console.log("any", v));
Promise.reject(new Error("r")).catch((e) => console.log("catch", e.message));
Promise.resolve(1).finally(() => console.log("finally")).then((v) => console.log("after", v));
`,
  },
  {
    id: "c291-promise-async-forms",
    title: "async 函数与立即调用的 async 箭头",
    src: `
async function f(n: number) { return n * 2; }
async function g() { const v = await f(3); console.log("g", v); }
g();
(async () => { console.log("iife", await Promise.resolve("z")); })();
`,
  },
  {
    id: "c291-function-name-and-length-forms",
    title: "函数名与形参个数的四个来源",
    src: `
function decl(a: number, b: number) { return a + b; }
const expr = function named(x: number) { return x; };
const arrow = (a: number, b = 1) => a + b;
const meth = { m(p: number) { return p; } };
console.log(decl.name, expr.name, arrow.name, meth.m.name);
console.log(decl.length, expr.length, arrow.length, meth.m.length);
`,
  },
  {
    id: "c291-function-bind-call-apply-forms",
    title: "bind / call / apply 与绑定后的 name / length",
    src: `
function f(this: any, a: number, b: number) { return this.base + a + b; }
const bound = f.bind({ base: 10 }, 1);
console.log(bound(2), bound.length, bound.name);
console.log(f.call({ base: 100 }, 1, 2), f.apply({ base: 0 }, [1, 2]));
`,
  },
  {
    id: "c291-function-tostring-forms",
    title: "函数的源码文本：三种写法的 toString",
    src: `
function f(a: number) { return a; }
console.log(f.toString().includes("function"), String(f) === f.toString());
console.log((() => 1).toString().includes("=>"));
const obj = { m() { return 1; } };
console.log(obj.m.toString().includes("m"));
`,
  },
  {
    id: "c291-function-prototype-shape",
    title: "函数自带的三格与 prototype 的形状",
    src: `
const f = function () {};
console.log(typeof f.prototype, typeof f.call, typeof f.apply, typeof f.bind);
console.log(Function.prototype.call.length, typeof Function.prototype.bind);
`,
  },
  {
    id: "c291-error-families-and-messages",
    title: "错误家族的 name / message 与 instanceof",
    src: `
const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
console.log(errs.map((e) => e.name + ":" + e.message).join(" "));
console.log(errs.every((e) => e instanceof Error), errs[0] instanceof TypeError);
`,
  },
  {
    id: "c291-error-cause-and-chain",
    title: "Error 的 cause 链",
    src: `
const inner = new Error("inner");
const outer = new Error("outer", { cause: inner });
console.log(outer.message, (outer as any).cause.message, outer.toString());
console.log(new Error("x").cause);
`,
  },
  {
    id: "c291-error-tostring-forms",
    title: "错误的 toString 与 String()",
    src: `
const e = new Error("boom");
console.log(e.toString(), String(e), e.message);
console.log(new TypeError("bad").toString());
`,
  },
  {
    id: "c291-error-custom-subclass-forms",
    title: "自定义错误子类：字段与两条 instanceof",
    src: `
class AppError extends Error {
  code: number;
  constructor(msg: string, code: number) { super(msg); this.code = code; this.name = "AppError"; }
}
const e = new AppError("bad", 42);
console.log(e.message, e.code, e.name, e instanceof AppError, e instanceof Error);
console.log(String(e));
`,
  },
  {
    id: "c291-console-log-multi-forms",
    title: "console.log 的多样实参与空调用",
    src: `
console.log(1, "a", true, null, undefined);
console.log([1, 2], { a: 1 }, new Map([["k", 1]]));
console.log();
`,
  },
  {
    id: "c291-console-log-nested-shapes",
    title: "console.log 的嵌套容器形状",
    src: `
console.log({ a: [1, { b: 2 }], c: new Set([1]) });
console.log([[1, 2], [3]]);
console.log({ n: null, u: undefined, f: () => 1 });
`,
  },
  {
    id: "c291-global-explicit-forms",
    title: "全局函数的显式调用与 globalThis",
    src: `
console.log(parseInt("3"), parseFloat("3.5"), isNaN("x"), isFinite("3"));
console.log(Boolean(0), Boolean(""), Boolean([]), String(0), Number(""));
console.log(typeof globalThis, globalThis.Math === Math);
`,
  },
  {
    id: "c291-global-object-wrappers",
    title: "Object(原始值) 的包装对象",
    src: `
const n = Object(1);
const s = Object("a");
const b = Object(true);
console.log(typeof n, typeof s, typeof b, n.valueOf(), s.valueOf(), b.valueOf());
`,
  },
  {
    id: "c291-parseint-radix-edges",
    title: "parseInt 的 radix 边界与 parseFloat 的怪串",
    src: `
console.log(parseInt(""), parseInt("-0x10"), parseInt("10", 2), parseInt("10", 37));
console.log(parseFloat("Infinity"), parseFloat("-1.5e-3"), parseFloat(".e3"));
`,
  },
  {
    id: "c291-array-splice-return-and-negative",
    title: "splice 的返回值与负起点",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.splice(1, 2).join(","), xs.join(","));
console.log([1, 2, 3].splice(-1, 1).join(","));
console.log([1, 2, 3].splice(1).join(","), [1, 2, 3].splice(9).length);
`,
  },
  {
    id: "c291-array-with-and-tosorted-forms",
    title: "toSorted / toReversed / with 三种不改原数组的写法",
    src: `
const xs = [3, 1, 2];
console.log(xs.toSorted().join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
console.log(xs.toSorted((a, b) => b - a).join(","));
`,
  },
  {
    id: "c291-collection-from-iterables",
    title: "集合互相复制：new Map(map) / new Set(set)",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2]]);
const m2 = new Map(m);
console.log(m2.size, m2.get("b"));
const s = new Set([1, 2, 3]);
const s2 = new Set(s);
console.log(s2.size, [...s2].join(","));
`,
  },
  {
    id: "c291-collection-own-keys",
    title: "集合的条目不是自有属性（Object.keys 给空）",
    src: `
const m = new Map([["a", 1]]);
const s = new Set([1]);
console.log(Object.keys(m as any).length, (m as any).a, Object.keys(s as any).length);
console.log(m.size, s.size);
`,
  },
  // ===== 第 297 轮补的一条：字符串迭代按码点 =====
  // 它是**发现孤立代理那一格时顺手加的** ✓（用户口径：「发现新问题就加对应语料」✓）——
  // 三件事一起钉 ✓：代理对合成一个 ✓、**孤立代理也要给出来** ✓、
  // 以及 **JSON.stringify 里落单的代理要写成 \\uXXXX** ✓（ES2019 那条 well-formed ✓）。
  {
    id: "c297-string-codepoint-iteration",
    title: "字符串迭代按码点：代理对合成一个、孤立代理原样、JSON 里落单的要转义",
    src: `
const s = "a\\u{1F600}b";
const seen: string[] = [];
for (const c of s) seen.push(c);
console.log(s.length, [...s].length, Array.from(s).length, seen.length, seen[1].length);
const [x, y] = "a\\u{1F600}";
console.log(x, y.length, [..."\\uDC00\\uD800"].length);
console.log(JSON.stringify([..."\\uD800"]), JSON.stringify("\\uD83D\\uDE00"));
`,
  },

  // ===== 第 304 轮：加宽矩阵（60 条）=====

  {
    id: "c304-std-array-tospliced",
    title: "Array.prototype.toSpliced / toReversed（不改原数组）",
    src: `
const xs = [1, 2, 3, 4];
console.log(xs.toSpliced(1, 2, "a", "b").join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
`,
  },
  {
    id: "c304-std-array-findindex-forms",
    title: "findIndex / findLastIndex 的命中与未命中",
    src: `
const xs = [5, 12, 8, 130, 44];
console.log(xs.findIndex((n) => n > 10), xs.findLastIndex((n) => n > 10));
console.log(xs.findIndex((n) => n > 1000), xs.findLast((n) => n > 10));
`,
  },
  {
    id: "c304-std-array-sort-numeric-string",
    title: "sort 缺省按字符串、给比较器按数字",
    src: `
const xs = [10, 1, 2, 20];
console.log(xs.slice().sort().join(","), xs.slice().sort((a, b) => a - b).join(","));
const words = ["b", "A", "a", "B"];
console.log(words.slice().sort().join(","));
`,
  },
  {
    id: "c304-std-array-fill-and-copywithin-forms",
    title: "fill / copyWithin 的负下标与越界",
    src: `
console.log([1, 2, 3, 4, 5].fill(0, -2).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","), [1, 2, 3].copyWithin(1, -1).join(","));
console.log([1, 2, 3].fill(9).join(","));
`,
  },
  {
    id: "c304-std-object-isprototypeof",
    title: "Object.prototype.isPrototypeOf",
    src: `
class A {}
class B extends A {}
const b = new B();
console.log(A.prototype.isPrototypeOf(b), Object.prototype.isPrototypeOf(b), B.prototype.isPrototypeOf({}));
console.log(A.isPrototypeOf(b));
`,
  },
  {
    id: "c304-std-object-setprototypeof-value",
    title: "Object.setPrototypeOf 之后方法的归属变了",
    src: `
const proto = { greet() { return "hi " + this.name; } };
const o: any = { name: "kim" };
Object.setPrototypeOf(o, proto);
console.log(o.greet(), Object.getPrototypeOf(o) === proto, Object.keys(o).join(","));
`,
  },
  {
    id: "c304-std-object-preventextensions-forms",
    title: "preventExtensions / seal / freeze 三档：isExtensible 与两个问法的答案",
    src: `
const a: any = { x: 1 };
const backA = Object.preventExtensions(a);
console.log(backA === a, Object.isExtensible(a), Object.isSealed(a), Object.isFrozen(a));
const b: any = { x: 1 };
Object.seal(b);
console.log(Object.isExtensible(b), Object.isSealed(b), Object.isFrozen(b));
const c: any = { x: 1 };
Object.freeze(c);
console.log(Object.isExtensible(c), Object.isSealed(c), Object.isFrozen(c));
console.log(Object.isSealed({}), Object.isExtensible("s"));
`,
  },
  {
    id: "c304-std-object-issealed-after-preventextensions",
    title: "preventExtensions 之后 isSealed 该是假（那一格还可配置）",
    src: `
const o: any = { x: 1 };
Object.preventExtensions(o);
console.log(Object.isExtensible(o), Object.isSealed(o), Object.isFrozen(o));
const p: any = { x: 1 };
Object.seal(p);
console.log(Object.isSealed(p), Object.isFrozen(p), Object.isExtensible(p));
const q: any = {};
Object.preventExtensions(q);
console.log(Object.isSealed(q), Object.isFrozen(q));
`,
  },
  {
    id: "c304-std-object-descriptor-accessor",
    title: "getOwnPropertyDescriptor 读访问器那一格",
    src: `
const o: any = { _v: 1 };
Object.defineProperty(o, "v", { get() { return this._v; }, set(n: number) { this._v = n; }, enumerable: true });
const d = Object.getOwnPropertyDescriptor(o, "v");
console.log(typeof d?.get, typeof d?.set, d?.enumerable, d?.configurable);
o.v = 5;
console.log(o.v);
`,
  },
  {
    id: "c304-std-object-defineproperties-forms",
    title: "defineProperties 一次装好几格",
    src: `
const o: any = {};
Object.defineProperties(o, {
  a: { value: 1, enumerable: true },
  b: { value: 2, enumerable: false, writable: true },
  c: { get() { return 3; }, enumerable: true },
});
console.log(o.a, o.b, o.c, Object.keys(o).join(","));
`,
  },
  {
    id: "c304-std-function-apply-forms",
    title: "apply 的实参数组与 this",
    src: `
function add(a: number, b: number) { return a + b + (this?.base ?? 0); }
console.log(add.apply({ base: 100 }, [1, 2]), add.apply(null, [3, 4]));
console.log(Math.max.apply(null, [3, 9, 4]));
`,
  },
  {
    id: "c304-std-function-bind-partial",
    title: "bind 的偏应用与新函数形状",
    src: `
function tag(prefix: string, a: string, b: string) { return prefix + a + b; }
const withPrefix = tag.bind(null, "#");
console.log(withPrefix("a", "b"), withPrefix.name, withPrefix.length);
const bound = tag.bind(null);
console.log(bound("x", "y", "z"));
`,
  },
  {
    id: "c304-std-function-call-chain",
    title: "call 连着用，以及绑定后的再绑定",
    src: `
function who(this: any) { return this.name; }
const o = { name: "o" };
const p = { name: "p" };
console.log(who.call(o), who.call(p), who.bind(o).call(p));
`,
  },
  {
    id: "c304-std-string-valueof-tostring",
    title: "valueOf / toString 在字符串包装上的取值",
    src: `
const s = "abc";
console.log(s.valueOf(), s.toString(), String.prototype.toString.call(s));
console.log(s.length, s[1], s.charAt(2));
`,
  },
  {
    id: "c304-std-string-charcodeat-forms",
    title: "charCodeAt / codePointAt 在代理对上的两种答案",
    src: `
const s = "a😀b";
console.log(s.length, s.charCodeAt(0), s.charCodeAt(1), s.codePointAt(1), s.codePointAt(0));
console.log(s.charCodeAt(99), s.codePointAt(-1));
`,
  },
  {
    id: "c304-std-string-repeat-and-split-forms",
    title: "repeat / split 的边界",
    src: `
console.log("ab".repeat(0) + "|", "ab".repeat(2), "a".repeat(2.9) + "|");
console.log(JSON.stringify("a,b,,c".split(",")), JSON.stringify("abc".split("")), JSON.stringify("".split(",")));
console.log(JSON.stringify("a1b2c".split("1")));
`,
  },
  {
    id: "c304-std-string-includes-and-indexof-forms",
    title: "includes / indexOf / startsWith 的起始位置",
    src: `
const s = "banana";
console.log(s.includes("na"), s.includes("na", 3), s.indexOf("na"), s.indexOf("na", 3), s.indexOf("zz"));
console.log(s.startsWith("ba"), s.endsWith("na"), s.startsWith("na", 2));
`,
  },
  {
    id: "c304-std-number-isnan-forms",
    title: "Number.isNaN / isFinite 与全局那两个的分工",
    src: `
console.log(Number.isNaN(NaN), Number.isNaN("NaN"), isNaN("NaN"), isNaN(NaN));
console.log(Number.isFinite("1"), isFinite("1"), Number.isFinite(Infinity), isFinite(Infinity));
`,
  },
  {
    id: "c304-std-number-parseint-vs-global",
    title: "Number.parseInt / parseFloat 与全局的同不同",
    src: `
console.log(Number.parseInt("42px"), parseInt("42px"), Number.parseInt("0x1f"), parseInt("1f", 16));
console.log(Number.parseFloat("3.5e2x"), parseFloat(".5"), Number.parseFloat("x"));
`,
  },
  {
    id: "c304-std-number-toexponential-forms",
    title: "toExponential 的位数与缺省",
    src: `
console.log((123.456).toExponential(2), (0.000123).toExponential(), (5).toExponential(0));
console.log((12345).toExponential(1));
`,
  },
  {
    id: "c304-std-number-limits-forms",
    title: "Number 的常量族：EPSILON / MAX_SAFE_INTEGER / 各极值",
    src: `
console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
console.log(Number.isSafeInteger(Number.MAX_SAFE_INTEGER), Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1));
`,
  },
  {
    id: "c304-std-math-cbrt-expm1-log1p",
    title: "Math.cbrt / expm1 / log1p 的取值",
    src: `
console.log(Math.cbrt(27), Math.cbrt(-8), Math.expm1(0), Math.log1p(0));
console.log(Math.expm1(1).toFixed(6), Math.log1p(Math.E - 1).toFixed(6));
`,
  },
  {
    id: "c304-std-math-atan2-forms",
    title: "Math.atan2 的四个象限与零",
    src: `
console.log(Math.atan2(1, 1).toFixed(6), Math.atan2(1, -1).toFixed(6));
console.log(Math.atan2(-1, -1).toFixed(6), Math.atan2(0, 0), Math.atan2(1, 0).toFixed(6));
`,
  },
  {
    id: "c304-std-math-sign-and-trunc-forms",
    title: "Math.sign / trunc 在 ±0 与小数上",
    src: `
console.log(Math.sign(-3), Math.sign(0), Object.is(Math.sign(-0), -0), Math.sign(NaN));
console.log(Math.trunc(4.9), Math.trunc(-4.9), Math.trunc(0.5), Math.trunc(-0.5));
`,
  },
  {
    id: "c304-std-math-clz32-forms",
    title: "Math.clz32 / imul / fround 的组合",
    src: `
console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0xffffffff), Math.clz32(4));
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.fround(0.1).toFixed(10));
`,
  },
  {
    id: "c304-std-encodeuri-decodeuri",
    title: "encodeURI / decodeURI / encodeURIComponent",
    src: `
const s = "a b&c=d?e";
console.log(encodeURI(s));
console.log(encodeURIComponent(s));
console.log(decodeURI(encodeURI(s)), decodeURIComponent(encodeURIComponent("中文 & 符号")));
`,
  },
  {
    id: "c304-std-json-stringify-undefined-and-holes",
    title: "JSON.stringify 遇到 undefined / 函数 / 洞",
    src: `
const o: any = { a: undefined, b: () => 1, c: 1, d: null };
console.log(JSON.stringify(o));
console.log(JSON.stringify([undefined, () => 1, 1, null]));
console.log(JSON.stringify(undefined), JSON.stringify(() => 1), JSON.stringify(null));
`,
  },
  {
    id: "c304-std-json-stringify-nested-arrays",
    title: "JSON.stringify 的嵌套数组与空容器",
    src: `
console.log(JSON.stringify({ a: [[1, 2], [], [null]], b: {}, c: [] }));
console.log(JSON.stringify([1, [2, [3, [4]]]]));
`,
  },
  {
    id: "c304-std-json-parse-forms",
    title: "JSON.parse 的空白、转义与数字",
    src: "\nconsole.log(JSON.stringify(JSON.parse('  { \"a\" : 1 , \"b\" : [ true , null ] }  ')));\nconsole.log(JSON.parse('\"a\\\\nb\"').length, JSON.parse(\"-1.5e2\"), JSON.parse(\"0\"));\n",
  },
  {
    id: "c304-std-map-getset-delete-forms",
    title: "Map 的增删改查与 size",
    src: `
const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.has("c"), m.delete("a"), m.size, m.get("a"));
m.clear();
console.log(m.size, [...m.keys()].length);
`,
  },
  {
    id: "c304-std-map-nan-and-object-keys",
    title: "Map 的键：NaN 与 ±0 的同一性",
    src: `
const m = new Map<any, string>();
m.set(NaN, "nan");
m.set(0, "zero");
m.set(-0, "negzero");
console.log(m.size, m.get(NaN), m.get(0), m.get(-0));
const o = {};
m.set(o, "obj");
console.log(m.get(o), m.get({}));
`,
  },
  {
    id: "c304-std-set-delete-has-forms",
    title: "Set 的增删与 NaN / ±0",
    src: `
const s = new Set<any>([1, 2, NaN, 0, -0]);
console.log(s.size, s.has(NaN), s.has(0), s.has(-0));
console.log(s.delete(2), s.size, [...s].length);
`,
  },
  {
    id: "c304-std-weakmap-getset",
    title: "WeakMap 的 get / set / has / delete",
    src: `
const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k), wm.get(k));
`,
  },
  {
    id: "c304-std-symbol-description-forms",
    title: "符号的 description / toString / 注册表",
    src: `
const a = Symbol("desc");
const b = Symbol();
console.log(a.description, b.description, a.toString(), String(a).length > 0);
console.log(Symbol.for("x") === Symbol.for("x"), Symbol.keyFor(Symbol.for("x")), Symbol.keyFor(a));
`,
  },
  {
    id: "c304-std-symbol-iterator-manual",
    title: "手动拿数组的 Symbol.iterator 再 next",
    src: `
const it = [10, 20][Symbol.iterator]();
console.log(it.next().value, it.next().value, it.next().done);
const s = "ab"[Symbol.iterator]();
console.log(s.next().value, s.next().value, s.next().done);
`,
  },
  {
    id: "c304-std-date-epoch-forms",
    title: "Date 的时间戳读法与 UTC 年月的往返",
    src: `
const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const d2 = new Date(Date.UTC(2020, 5, 15, 12, 30, 45, 123));
console.log(d2.getTime(), d2.toISOString());
console.log(new Date(1e12).getUTCFullYear());
`,
  },
  {
    id: "c304-std-promise-all-forms",
    title: "Promise.all 的次序与非承诺项",
    src: `
Promise.all([Promise.resolve(3), 1, Promise.resolve(2)]).then((xs) => console.log(xs.join(",")));
Promise.all([]).then((xs) => console.log("empty", xs.length));
Promise.all([Promise.resolve(1), Promise.reject(new Error("no"))]).catch((e) => console.log("rejected", e.message));
`,
  },
  {
    id: "c304-std-promise-race-forms",
    title: "Promise.race / allSettled / any 的三种结清",
    src: `
Promise.race([Promise.resolve("fast"), new Promise((r) => r("slow"))]).then((v) => console.log("race", v));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((rs) => console.log(rs.map((r) => r.status).join(",")));
Promise.any([Promise.reject(new Error("a")), Promise.resolve("ok")]).then((v) => console.log("any", v));
`,
  },
  {
    id: "c304-std-promise-finally-order",
    title: "finally 的返回值不改结论、次序在中间",
    src: `
Promise.resolve(1)
  .finally(() => console.log("f1"))
  .then((v) => { console.log("then", v); return v + 1; })
  .finally(() => console.log("f2"))
  .then((v) => console.log("last", v));
`,
  },
  {
    id: "c304-std-async-map-await",
    title: "async 里的 map + await 串行",
    src: `
async function double(n: number) { return n * 2; }
async function run() {
  const out: number[] = [];
  for (const n of [1, 2, 3]) out.push(await double(n));
  return out.join(",");
}
run().then((s) => console.log(s));
`,
  },
  {
    id: "c304-std-console-log-undefined-null",
    title: "console.log 打 undefined / null / 空串 / 布尔",
    src: `
console.log(undefined, null, "", true, false);
console.log([undefined, null, ""], { a: undefined, b: null });
`,
  },
  {
    id: "c304-std-console-log-nested-arrays",
    title: "console.log 打嵌套数组与稀疏数组",
    src: `
console.log([1, [2, [3, [4]]]]);
console.log([1, , 3]);
console.log(new Array(3));
`,
  },
  {
    id: "c304-std-global-parseint-forms",
    title: "全局 parseInt 的基数与前缀",
    src: `
console.log(parseInt("0x10"), parseInt("0x10", 16), parseInt("10", 2), parseInt("0b10"));
console.log(parseInt("  42  "), parseInt("-7.9"), parseInt("zz"), parseInt(""), Number.isNaN(parseInt("x")));
`,
  },
  {
    id: "c304-std-global-isnan-coercion",
    title: "全局 isNaN / isFinite 的隐式转换",
    src: `
console.log(isNaN(undefined), isNaN(null), isNaN(""), isNaN(" "), isNaN("1a"), isNaN([]), isNaN([1]));
console.log(isFinite(""), isFinite(null), isFinite([]), isFinite([1]));
`,
  },
  {
    id: "c304-std-string-fromcodepoint-forms",
    title: "String.fromCodePoint / fromCharCode 在代理对上的差别",
    src: `
console.log(String.fromCodePoint(0x1f600).length, String.fromCharCode(0x1f600).length);
console.log(String.fromCodePoint(65, 66), String.fromCharCode(65, 66));
console.log(String.fromCharCode(0xd83d, 0xde00).length);
`,
  },
  {
    id: "c304-std-array-of-and-from-forms",
    title: "Array.of 与 Array.from 的三种来源",
    src: `
console.log(Array.of(1, 2, 3).join(","), Array.of(3).length, new Array(3).length);
console.log(Array.from([1, 2], (x) => x * 2).join(","));
console.log(Array.from({ length: 3 }, (_, i) => i).join(","));
`,
  },
  {
    id: "c304-std-object-keys-on-array",
    title: "Object.keys / entries 作用在数组与字符串上",
    src: `
console.log(Object.keys([1, 2, 3]).join(","));
console.log(Object.entries([7, 8]).map((p) => p[0] + p[1]).join(","));
console.log(Object.keys("ab").join(","), Object.values({ x: 1, y: 2 }).join(","));
`,
  },
  {
    id: "c304-std-object-fromentries-forms",
    title: "Object.fromEntries 的三种来源",
    src: `
console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["k", "v"]]))));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["x", 2]])));
`,
  },
  {
    id: "c304-std-error-tostring-forms",
    title: "Error.prototype.toString 的拼法",
    src: `
console.log(String(new Error("boom")));
console.log(String(new TypeError("bad")));
const e = new Error("m");
e.name = "";
console.log(String(e));
const e2 = new Error("");
e2.name = "Custom";
console.log(String(e2));
`,
  },
  {
    id: "c304-std-array-reduce-forms",
    title: "reduce 的初值与空数组",
    src: `
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, 0));
const words = ["a", "b"];
console.log(words.reduce((acc, w, i) => acc + i + w, ""));
`,
  },
  {
    id: "c304-std-array-iterator-manual-forms",
    title: "手动用 keys / values / entries 迭代器",
    src: `
const k = ["a", "b"].keys();
const v = ["a", "b"].values();
const e = ["a", "b"].entries();
console.log(k.next().value, v.next().value, JSON.stringify(e.next().value));
console.log(JSON.stringify([...["x", "y"].entries()]));
`,
  },
  {
    id: "c304-std-array-flat-and-flatmap-forms",
    title: "flat / flatMap 的深度与空结果",
    src: `
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, 2].flatMap((x) => (x === 1 ? [] : [x, x])).join(","));
`,
  },
  {
    id: "c304-std-array-at-and-slice-negative",
    title: "at / slice 的负下标组合",
    src: `
const xs = [1, 2, 3, 4, 5];
console.log(xs.at(-1), xs.at(0), xs.at(9), xs.at(-9));
console.log(xs.slice(-3, -1).join(","), xs.slice(2, 1).join(",") + "|");
`,
  },
  {
    id: "c304-std-string-normalize-ascii-forms",
    title: "normalize 在已规范化的串上是恒等",
    src: "\nconst s = \"abc\";\nconsole.log(s.normalize(), s.normalize(\"NFC\") === s, s.normalize(\"NFD\") === s);\nconsole.log(\"e\\u0301\".normalize(\"NFC\").length, \"\\u00e9\".normalize(\"NFD\").length);\n",
  },
  {
    id: "c304-std-string-replace-forms",
    title: "replace / replaceAll 的字符串形态与 $ 记号",
    src: "\nconsole.log(\"a-b-c\".replace(\"-\", \"+\"), \"a-b-c\".replaceAll(\"-\", \"+\"));\nconsole.log(\"abc\".replace(\"b\", \"[$&]\"), \"abc\".replace(\"b\", \"[$`]\"), \"abc\".replace(\"b\", \"[$']\"));\nconsole.log(\"ab\".replace(\"a\", \"$$\"));\n",
  },
  {
    id: "c304-std-map-set-spread-and-construct",
    title: "Map / Set 的构造来源与展开",
    src: `
const m = new Map<string, number>([["a", 1]]);
console.log([...m.keys()].join(","), [...m.values()].join(","), JSON.stringify([...m.entries()]));
const s = new Set<number>([1, 1, 2]);
console.log([...s].join(","), new Set("aab").size);
console.log(new Map(m).size, new Set(s).size);
`,
  },
  {
    id: "c304-std-array-tostring-and-join-holes",
    title: "数组 join / toString 遇到洞、null、嵌套",
    src: `
const xs: any[] = [1, , 3, null, undefined, [4, 5], { a: 1 }];
console.log(xs.join("|"));
console.log(String(xs) === xs.join(","), [].join("|") + "|", [null].join("|") + "|");
`,
  },
  {
    id: "c304-std-object-assign-forms",
    title: "Object.assign 的多源、覆盖与返回目标",
    src: `
const target = { a: 1 };
const out = Object.assign(target, { b: 2 }, { a: 9 }, null as any, undefined as any);
console.log(out === target, JSON.stringify(target), Object.keys(target).join(","));
console.log(JSON.stringify(Object.assign({}, "ab")));
`,
  },
  {
    id: "c304-std-date-parse-and-invalid",
    title: "Date.parse 的合法与非法形状",
    src: `
console.log(Date.parse("1970-01-01T00:00:00.000Z"), Date.parse("2020-05-15T10:20:30Z"));
console.log(Number.isNaN(Date.parse("not a date")), Number.isNaN(new Date("nope").getTime()));
console.log(new Date(0).toISOString(), String(new Date(NaN)));
`,
  },
  {
    id: "c304-std-error-families-forms",
    title: "五个错误族的 name / message / instanceof",
    src: `
const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
console.log(errs.map((e) => e.name).join(","));
console.log(errs.map((e) => e instanceof Error).join(","));
console.log(String(errs[2]), errs[3].message);
`,
  },

  // ===== 第 305 轮：加宽矩阵（60 条）=====

  {
    id: "c305-std-queue-microtask-order",
    title: "`queueMicrotask` 排在 `Promise.then` 同一队里",
    src: `
queueMicrotask(() => console.log("micro"));
Promise.resolve().then(() => console.log("then"));
console.log("sync");
`,
  },
  {
    id: "c305-std-map-groupby",
    title: "`Map.groupBy` 分出来的是 `Map`（键可以是任意值）",
    src: `
const m = Map.groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(m instanceof Map, m.size, JSON.stringify([...m.entries()]));
`,
  },
  {
    id: "c305-std-object-groupby-key-types",
    title: "`Object.groupBy` 的键一定是字符串",
    src: `
const g = Object.groupBy([1, 2, 3], (n) => n % 2);
console.log(Object.keys(g).join(","), JSON.stringify(g));
`,
  },
  {
    id: "c305-std-promise-withresolvers",
    title: "`Promise.withResolvers`",
    src: `
const { promise, resolve, reject } = Promise.withResolvers<number>();
promise.then((v) => console.log("got", v));
resolve(3);
console.log(typeof reject);
`,
  },
  {
    id: "c305-std-json-stringify-tojson-on-array",
    title: "数组自己带 `toJSON` 时 `JSON.stringify` 先问它",
    src: `
const arr: any = [1, 2];
arr.toJSON = () => "custom";
console.log(JSON.stringify(arr), JSON.stringify({ arr }));
`,
  },
  {
    id: "c305-std-json-stringify-omits-functions",
    title: "`JSON.stringify`：对象里的函数整格丢掉、数组里的写 null",
    src: `
console.log(JSON.stringify({ a: 1, f: () => 1, u: undefined }), JSON.stringify([1, () => 1, undefined]));
`,
  },
  {
    id: "c305-std-json-stringify-nested-tojson",
    title: "嵌套的 `toJSON` 一层层都问",
    src: `
const o = {
  a: { toJSON: () => "A" },
  b: [{ toJSON: () => "B" }],
};
console.log(JSON.stringify(o));
`,
  },
  {
    id: "c305-std-object-entries-with-symbols",
    title: "`Object.entries` 含符号键吗（不含），`getOwnPropertySymbols` 含",
    src: `
const s = Symbol("s");
const o: any = { a: 1, [s]: 2 };
console.log(Object.entries(o).length, Object.getOwnPropertySymbols(o).length, Object.keys(o).join(","));
`,
  },
  {
    id: "c305-std-object-assign-three-sources",
    title: "`Object.assign` 三个来源，后面的覆盖前面的",
    src: `
const target = Object.assign({}, { a: 1 }, { b: 2 }, { a: 3 });
console.log(JSON.stringify(target), target.a, target.b);
`,
  },
  {
    id: "c305-std-array-sort-undefined-and-holes",
    title: "`sort` 把 `undefined` 放最后、洞再往后",
    src: `
const xs: any[] = [3, undefined, 1, , 2];
console.log(xs.sort().join(","), xs.length, 4 in xs);
`,
  },
  {
    id: "c305-std-array-every-some-empty",
    title: "空数组上的 `every` / `some` / `reduce` 带初值",
    src: `
console.log([].every(() => false), [].some(() => true), [].reduce((a, b) => a + b, 5));
`,
  },
  {
    id: "c305-std-string-surrogate-units",
    title: "代理对的 `length` / `charCodeAt` / `codePointAt`",
    src: `
const s = "😀";
console.log(s.length, s.charCodeAt(0), s.codePointAt(0), s.charCodeAt(0).toString(16));
`,
  },
  {
    id: "c305-std-string-fromcharcode-pair",
    title: "`fromCharCode` 拼代理对 与 `fromCodePoint` 一个码位",
    src: `
console.log(String.fromCharCode(0xd83d, 0xde00), String.fromCodePoint(0x1f600), String.fromCharCode(0x41));
`,
  },
  {
    id: "c305-std-string-tostring-radix-36",
    title: "`toString(radix)` 的几个基数",
    src: `
console.log((255).toString(16), (255).toString(2), (123456789).toString(36), (0.5).toString(2));
`,
  },
  {
    id: "c305-std-math-round-half-and-float",
    title: "`Math.round` 的平局方向与浮点尾巴",
    src: `
console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5), Math.round(1.005 * 100) / 100);
`,
  },
  {
    id: "c305-std-array-from-holes-and-length",
    title: "`Array.from` 对数组式对象与洞的填法",
    src: `
console.log(Array.from({ length: 3 }, (_, i) => i * 2).join(","));
console.log(Array.from({ 0: "a", 2: "c", length: 3 }).join(","));
`,
  },
  {
    id: "c305-std-object-fromentries-duplicates",
    title: "`Object.fromEntries` 遇到重复键：最后一个赢",
    src: `
console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2], ["a", 3]])));
`,
  },
  {
    id: "c305-std-function-method-length-and-name",
    title: "类方法的 `length` / `name`",
    src: `
class C {
  m(a: number, b = 1, ...rest: number[]) { return a + b + rest.length; }
}
console.log(C.prototype.m.length, C.prototype.m.name, new C().m(1));
`,
  },
  {
    id: "c305-std-bound-function-length",
    title: "`bind` 之后那个函数的 `length` 与 `name`",
    src: `
function f(a: number, b: number, c: number) { return a + b + c; }
const g = f.bind(null, 1, 2);
console.log(g(3), g.length, g.name);
`,
  },
  {
    id: "c305-std-array-valueof-identity",
    title: "数组的 `valueOf` 给的就是它自己",
    src: `
const xs = [1];
console.log(xs.valueOf() === xs, typeof xs.valueOf(), Array.isArray(xs.valueOf()));
`,
  },
  {
    id: "c305-std-array-tostring-in-template",
    title: "数组进模板串走的是 `toString`（即 `join`）",
    src: "\nconsole.log(\"xs=\" + [1, 2] + \"!\", `ys=${[3, 4]}`);\n",
  },
  {
    id: "c305-std-object-tostring-in-template",
    title: "普通对象进模板串给 `[object Object]`",
    src: "\nconsole.log(`o=${({ a: 1 })}`, \"x\" + { a: 1 });\n",
  },
  {
    id: "c305-std-promise-all-with-rejection",
    title: "`Promise.all` 里有一项被拒绝",
    src: `
Promise.all([Promise.resolve(1), Promise.reject(new Error("no"))]).catch((e) => console.log("caught", (e as Error).message));
console.log("sync");
`,
  },
  {
    id: "c305-std-promise-all-empty",
    title: "`Promise.all([])` 与 `Promise.race` 的空实参",
    src: `
Promise.all([]).then((xs) => console.log("all", JSON.stringify(xs)));
console.log("sync");
`,
  },
  {
    id: "c305-std-thenable-adoption",
    title: "`async` 返回一个 thenable：该被采纳",
    src: `
async function f() {
  return { then(res: any) { res(42); } } as any;
}
f().then((v) => console.log("v", v));
console.log("sync");
`,
  },
  {
    id: "c305-std-then-returns-promise-adoption",
    title: "`then` 回调返回承诺：结果承诺采纳它",
    src: `
Promise.resolve(1)
  .then(() => Promise.resolve(2))
  .then((v) => console.log("value", v));
console.log("sync");
`,
  },
  {
    id: "c305-std-error-cause-and-name",
    title: "`Error` 的 `cause` 与自定义 `name`",
    src: `
const e = new Error("m", { cause: new RangeError("inner") });
console.log(e.message, e.name, (e.cause as Error).name);
class MyErr extends Error { name = "MyErr"; }
const m = new MyErr("x");
console.log(m.name, m.message, m instanceof Error, String(m));
`,
  },
  {
    id: "c305-std-date-parse-invalid-forms",
    title: "`Date.parse` 的几种非 ISO 输入给 NaN",
    src: `
console.log(Date.parse("2021-03-04"), Date.parse("2021-03-04T05:06:07Z"), Number.isNaN(Date.parse("nope")));
`,
  },
  {
    id: "c305-std-date-setmonth-rollover",
    title: "`setMonth` 溢出会进位",
    src: `
const d = new Date(0);
d.setUTCMonth(13);
console.log(d.getUTCFullYear(), d.getUTCMonth());
`,
  },
  {
    id: "c305-std-map-delete-return-and-has",
    title: "`Map.delete` 的返回值与删不存在的键",
    src: `
const m = new Map([["a", 1]]);
console.log(m.delete("a"), m.delete("a"), m.has("a"), m.size);
`,
  },
  {
    id: "c305-std-set-foreach-args",
    title: "`Set.forEach` 的三个实参",
    src: `
const s = new Set(["a", "b"]);
s.forEach((v, k, self) => console.log(v, k, self === s));
`,
  },
  {
    id: "c305-std-symbol-tostringtag-custom",
    title: "自定义 `Symbol.toStringTag` 影响 `Object.prototype.toString`",
    src: `
class C { get [Symbol.toStringTag]() { return "Custom"; } }
console.log(Object.prototype.toString.call(new C()), String(new C()));
`,
  },
  {
    id: "c305-std-array-fill-with-object",
    title: "`fill` 同一个引用填满（与 `map` 造新对象对照）",
    src: `
const filled = new Array(3).fill({ n: 0 });
filled[0].n = 9;
console.log(filled.map((x) => x.n).join(","), filled[0] === filled[1]);
`,
  },
  {
    id: "c305-std-array-flatmap-and-depth",
    title: "`flatMap` 只摊一层",
    src: `
console.log([[1], [2, 3]].flatMap((x) => x).join(","), [[[1]], [[2]]].flatMap((x) => x).length);
`,
  },
  {
    id: "c305-std-string-split-empty-and-limit",
    title: "`split` 的分隔符为空串与 limit",
    src: `
console.log(JSON.stringify("abc".split("")), JSON.stringify("a,b,c".split(",", 2)), JSON.stringify("".split(",")));
`,
  },
  {
    id: "c305-std-string-replace-special-patterns",
    title: "替换文本里的 `$&` / `$1`（字符串模式没有捕获组）",
    src: `
console.log("abc".replace("b", "[$&]"), "abc".replace("b", "$1"));
`,
  },
  {
    id: "c305-std-string-trim-unicode-space",
    title: "非 ASCII 空白（`\\u00a0`）在 JS 里可被 `trim`",
    src: "\nconsole.log(JSON.stringify(\"\\u00a0x\\u00a0\".trim()), JSON.stringify(\"\\u3000y\".trim()));\n",
  },
  {
    id: "c305-std-string-normalize-forms",
    title: "`normalize` 的四种形式在纯 ASCII 上是恒等",
    src: `
console.log("abc".normalize("NFC"), "abc".normalize("NFD"), "abc".normalize(), "abc".normalize("NFKC") === "abc");
`,
  },
  {
    id: "c305-std-encodeuri-roundtrip",
    title: "`encodeURIComponent` / `decodeURIComponent` 往返",
    src: `
const s = "a b&c=d";
const enc = encodeURIComponent(s);
console.log(enc, decodeURIComponent(enc) === s, encodeURI("http://x/y z"));
`,
  },
  {
    id: "c305-std-array-iterator-symbol-method",
    title: "数组的 `Symbol.iterator` 是一个可调用的方法",
    src: `
const xs = [1, 2];
const it = (xs as any)[Symbol.iterator]();
console.log(typeof (xs as any)[Symbol.iterator], JSON.stringify(it.next()), JSON.stringify(it.next()));
`,
  },
  {
    id: "c305-std-custom-iterable-symbol-iterator",
    title: "对象自定义 `Symbol.iterator` 之后能进 `for..of` 与展开",
    src: `
const range: any = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let i = this.from;
    const to = this.to;
    return { next: () => (i <= to ? { value: i++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...range].join(","));
for (const v of range) console.log("v", v);
`,
  },
  {
    id: "c305-std-number-wrapper-object",
    title: "`new Number(5)` 是一个对象，`Number(5)` 是原始值",
    src: `
const boxed = new Number(5);
console.log(typeof boxed, boxed.valueOf(), typeof Number(5), boxed + 1);
`,
  },
  {
    id: "c305-std-object-wrapper-call",
    title: "`Object(1)` / `Object(\"a\")` 给包装对象",
    src: `
console.log(typeof Object(1), typeof Object("a"), typeof Object(true), Object(1).valueOf());
`,
  },
  {
    id: "c305-std-string-wrapper-methods",
    title: "包装对象上的字符串方法",
    src: `
const s = new String("ab");
console.log(s.length, s.toUpperCase(), s + "c", typeof s);
`,
  },
  {
    id: "c305-std-boolean-object-truthiness",
    title: "`new Boolean(false)` 是真值",
    src: `
const b = new Boolean(false);
console.log(typeof b, Boolean(b), b.valueOf(), String(b));
`,
  },
  {
    id: "c305-std-array-tostring-custom-element",
    title: "`Array.prototype.toString` 该问每个元素的 `toString`",
    src: `
class C { toString() { return "C!"; } }
console.log([new C(), 1].toString(), [new C()].join("-"));
`,
  },
  {
    id: "c305-std-console-log-function-name-from-property",
    title: "`console.log({ f: () => 1 })` 里那个函数的显示名",
    src: `
const f = () => 1;
console.log({ f }, { m() {} }, [function named() {}]);
`,
  },
  {
    id: "c305-std-object-getownpropertydescriptors-all",
    title: "`Object.getOwnPropertyDescriptors` 一次拿全部描述符",
    src: `
const o = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false });
const ds = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(ds).join(","), ds.a.writable, ds.b.enumerable, Object.keys(o).join(","));
`,
  },
  {
    id: "c305-std-object-defineproperty-getter-setter",
    title: "`defineProperty` 的 get/set 描述符能用",
    src: `
const o: any = { _v: 1 };
Object.defineProperty(o, "v", {
  get() { return this._v * 10; },
  set(next: number) { this._v = next; },
  enumerable: true,
});
o.v = 3;
console.log(o.v, o._v, Object.keys(o).join(","));
`,
  },
  {
    id: "c305-std-array-length-nonwritable",
    title: "把数组 `length` 设成不可写之后 `push`",
    src: `
const xs: any = [1, 2];
Object.defineProperty(xs, "length", { writable: false });
try {
  xs.push(3);
  console.log("pushed", xs.length);
} catch (e) {
  console.log("threw", (e as Error).name);
}
`,
  },
  {
    id: "c305-std-json-stringify-indent-object",
    title: "`JSON.stringify` 的缩进形态在嵌套对象上",
    src: `
console.log(JSON.stringify({ a: 1, b: { c: [1, 2] } }, null, 2));
`,
  },
  {
    id: "c305-std-json-parse-nested-types",
    title: "`JSON.parse` 出来的嵌套结构再走一遍方法",
    src: `
const v = JSON.parse('{"xs":[3,1,2],"name":"n"}');
console.log(v.xs.sort().join(","), v.name.toUpperCase(), Array.isArray(v.xs));
`,
  },
  {
    id: "c305-std-error-stack-absent-forms",
    title: "`Error` 的 `message` / `name` 与 `toString` 三种形态",
    src: `
console.log(String(new Error("m")), String(new TypeError("t")), String(new Error()));
`,
  },
  {
    id: "c305-std-global-isfinite-vs-number",
    title: "全局 `isFinite` 会转换，`Number.isFinite` 不会",
    src: `
console.log(isFinite("1"), Number.isFinite("1"), isNaN("x"), Number.isNaN("x"));
`,
  },
  {
    id: "c305-std-parseint-prefix-and-radix",
    title: "`parseInt` 的前缀、空白与非法尾部",
    src: `
console.log(parseInt("0x10"), parseInt("10", 2), parseInt("  12px"), parseInt(""), parseInt("-3.9"));
`,
  },
  {
    id: "c305-std-number-tostring-exponential",
    title: "`toExponential` 的缺省位数与给位数",
    src: `
console.log((12345.678).toExponential(), (12345.678).toExponential(2), (0.000123).toExponential(1));
`,
  },
  {
    id: "c305-std-math-sign-negzero-and-trunc",
    title: "`Math.sign(-0)` / `Math.trunc` 的边角",
    src: `
console.log(Math.sign(-0), 1 / Math.sign(-0), Math.trunc(-0.9), Math.trunc(0.9), Math.cbrt(-8));
`,
  },
  {
    id: "c305-std-array-reduce-right-and-findindex",
    title: "`reduceRight` 与 `findIndex` / `findLastIndex`",
    src: `
console.log([1, 2, 3].reduceRight((a, b) => a + "" + b), [1, 2, 3].findIndex((n) => n > 1), [1, 2, 3].findLastIndex((n) => n < 3));
`,
  },
  {
    id: "c305-std-object-freeze-nested",
    title: "`Object.freeze` 是浅的（内层照改）",
    src: `
const o = Object.freeze({ inner: { n: 1 } });
o.inner.n = 2;
console.log(o.inner.n, Object.isFrozen(o), Object.isFrozen(o.inner));
`,
  },
  {
    id: "c305-std-array-tospliced-and-with",
    title: "`toSpliced` / `with` 不改原数组",
    src: `
const xs = [1, 2, 3];
console.log(xs.toSpliced(1, 1, 9).join(","), xs.with(0, 7).join(","), xs.join(","));
`,
  },

  // ===== 第 308 轮：`Array.prototype[Symbol.iterator]` 挂上之后补的一条 =====

  {
    id: "c308-std-array-symbol-iterator-manual",
    title: "数组的 `Symbol.iterator` 是一个真方法（取出来自己走）",
    src: "\nconst it: any = [10, 20][Symbol.iterator]();\nconsole.log(it.next().value, it.next().value, it.next().done);\nconst cursor: any = [1, 2, 3][Symbol.iterator]();\nconsole.log([...cursor].join(\",\"));\nconsole.log(typeof [][Symbol.iterator]);\n",
  },
  {
    id: "c308-std-symbol-iterator-call-in-spread",
    title: "展开位里「取 `Symbol.iterator` 再调」——`()` 会逃出展开",
    src: "\nconst a: any = [10, 20];\nconsole.log([...a[Symbol.iterator]()].join(\",\"));\n",
  },

  // ===== 第 310 轮：包装对象那一族（本轮的修法） =====

  {
    id: "c310-std-wrapper-object-shapes",
    title: "三族包装对象的形状：`typeof` / `valueOf` / 下标 / `Object.keys` / `JSON`",
    src: "\nconst s: any = new String(\"ab\");\nconsole.log(s.length, s[0], s[1], Object.keys(s).join(\",\"));\nconsole.log(typeof s, s.valueOf(), s.toString(), s.toUpperCase());\nconst n: any = new Number(5);\nconsole.log(typeof n, n.valueOf(), n + 1, n.toFixed(1));\nconst b: any = new Boolean(false);\nconsole.log(typeof b, b.valueOf(), String(b), b + \"\");\nconsole.log(JSON.stringify(n), JSON.stringify(b), JSON.stringify(s));\n",
  },

  // ===== 第 311 轮：百分号编解码与 trim 的非 ASCII 那一批 =====

  {
    id: "c311-std-percent-encoding-edges",
    title: "百分号编解码的边界：代理对 · 保留字符 · 非 ASCII 空白",
    src: "\nconsole.log(encodeURIComponent(\"😀\"), decodeURIComponent(\"%F0%9F%98%80\"));\nconsole.log(decodeURI(\"%2F\"), decodeURIComponent(\"%2F\"));\nconsole.log(encodeURI(\"http://x/y z\"), encodeURIComponent(\"\\u00a0|\\u3000\"));\nconsole.log(JSON.stringify(\"\\u00a0x\\u00a0\".trim()), JSON.stringify(\"\\u3000y\".trim()), JSON.stringify(\"\\ufeffz\".trim()));\n",
  },

  // ===== 第 318 轮：执行器那两格 =====

  {
    id: "c318-std-promise-executor-settle",
    title: "执行器递出来的 `resolve` / `reject`：直接调、当值传出去、以及兑现值是承诺",
    src: "\nfunction handOff(cb: (v: number) => void): void { cb(7); }\nnew Promise<number>((res) => { res(1); })\n  .then((v) => { console.log(\"resolve\", v); return v; })\n  .then(() => new Promise<number>((_res, rej) => { rej(new Error(\"no\")); }))\n  .catch((e: any) => { console.log(\"reject\", e.message); return 0; })\n  .then(() => new Promise<number>((res) => { res(Promise.resolve(4) as any); }))\n  .then((v) => { console.log(\"resolve-promise\", v); return v; })\n  .then(() => new Promise<number>((res) => { handOff(res); }))\n  .then((v) => console.log(\"passed-as-value\", v));\n",
  },

  // ============ 第 323 轮加宽：26 条 ============
  {
    id: "c323-std-map-groupby",
    title: "Map.groupBy：按键分组成 Map",
    src: `
const xs = [1, 2, 3, 4, 5];
const m = Map.groupBy(xs, (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(m instanceof Map, m.get("odd").join(","), m.get("even").join(","));
`,
  },
  {
    id: "c323-std-promise-withresolvers",
    title: "Promise.withResolvers：一对结清回调与承诺",
    src: `
const { promise, resolve, reject } = Promise.withResolvers();
promise.then((v) => console.log("resolved", v));
resolve(7);
const p2 = Promise.withResolvers();
p2.promise.catch((e) => console.log("rejected", e));
p2.reject("no");
console.log(typeof resolve, typeof reject);
`,
  },
  {
    id: "c323-std-queue-microtask",
    title: "queueMicrotask：与 Promise.then 同一个队列、按序",
    src: `
queueMicrotask(() => console.log("micro-1"));
Promise.resolve().then(() => console.log("then-1"));
queueMicrotask(() => console.log("micro-2"));
console.log("sync");
`,
  },
  {
    id: "c323-std-object-getownpropertydescriptors",
    title: "Object.getOwnPropertyDescriptors：一次拿全表的描述符",
    src: `
const o = { a: 1, get b() { return 2; } };
Object.defineProperty(o, "c", { value: 3, enumerable: false, writable: false });
const d = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(d).join(","), d.a.value, d.a.enumerable, d.b.get !== undefined, d.c.writable);
`,
  },
  {
    id: "c323-std-set-union-intersection",
    title: "Set 的集合运算：union / intersection / difference / symmetricDifference",
    src: `
const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log([...a.union(b)].join(","));
console.log([...a.intersection(b)].join(","));
console.log([...a.difference(b)].join(","));
console.log([...a.symmetricDifference(b)].join(","));
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isDisjointFrom(b));
`,
  },
  {
    id: "c323-std-array-fromasync",
    title: "Array.fromAsync：异步可迭代对象收成数组",
    src: `
async function* page() { yield 1; yield 2; yield 3; }
async function main() {
  const xs = await Array.fromAsync(page());
  console.log(xs.join(","));
  console.log((await Array.fromAsync([1, 2], (v) => Promise.resolve(v * 2))).join(","));
}
main();
`,
  },
  {
    id: "c323-std-string-raw",
    title: "String.raw：标签模板的 raw 那一栏原样取出",
    src: `
const s = String.raw\`a\\nb\`;
console.log(s, s.length);
console.log(String.raw\`x\${1 + 1}y\\t\`, String.raw({ raw: ["p", "q"] }, "-"));
`,
  },
  {
    id: "c323-std-date-local-getters",
    title: "Date 的本地 getter 与多实参构造",
    src: `
const d = new Date(2020, 0, 2, 3, 4, 5);
console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
console.log(new Date(2020, 5, 31).getMonth(), d.getDay() >= 0);
`,
  },
  {
    id: "c323-std-array-at-and-negative-index",
    title: "Array.at 的负数下标与边界；字符串也有一份",
    src: `
const xs = [10, 20, 30];
console.log(xs.at(0), xs.at(-1), xs.at(3), xs.at(-4));
console.log("abc".at(-1), "abc".at(5));
`,
  },
  {
    id: "c323-std-string-padstart-padend",
    title: "padStart / padEnd：目标长度、填充串截断",
    src: `
console.log("5".padStart(3, "0"), "5".padEnd(3, "*"), "abc".padStart(2));
console.log("x".padStart(5, "ab"), "y".padEnd(4, "12"), "".padStart(3, "-"));
`,
  },
  {
    id: "c323-std-json-stringify-replacer-array",
    title: "JSON.stringify 的 replacer 数组：挑键与嵌套",
    src: `
const o = { a: 1, b: { a: 2, c: 3 }, c: 4 };
console.log(JSON.stringify(o, ["a", "b"]));
console.log(JSON.stringify(o, ["a", "c"]));
`,
  },
  {
    id: "c323-std-json-parse-reviver-nested",
    title: "JSON.parse 的 reviver：自底向上、整棵树",
    src: `
const out = JSON.parse('{"a":{"b":1},"c":[2,3]}', (k, v) => (typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(out));
`,
  },
  {
    id: "c323-std-array-sort-stability",
    title: "sort 的稳定性：相等元素保持原序",
    src: `
const rows = [{ k: 1, i: "a" }, { k: 0, i: "b" }, { k: 1, i: "c" }, { k: 0, i: "d" }];
console.log(rows.sort((p, q) => p.k - q.k).map((r) => r.i).join(""));
console.log([10, 9, 1, 2].sort().join(","));
`,
  },
  {
    id: "c323-std-map-and-set-iteration",
    title: "Map / Set 的遍历：keys、values、entries、forEach",
    src: `
const m = new Map([["a", 1], ["b", 2]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map(([k, v]) => k + v).join("|"));
m.forEach((v, k, self) => console.log(k, v, self.size));
const s = new Set([1, 2]);
s.forEach((v, v2) => console.log(v === v2));
`,
  },
  {
    id: "c323-std-promise-any-and-race",
    title: "Promise.any 的聚合错误与 race 的第一个结清",
    src: `
Promise.any([Promise.reject("a"), Promise.resolve(2)]).then((v) => console.log("any", v));
Promise.any([Promise.reject("x"), Promise.reject("y")]).catch((e) => console.log("agg", e.errors.join(",")));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
`,
  },
  {
    id: "c323-std-function-bind-partial",
    title: "bind 的偏应用与 this 固定；bound 的 length / name",
    src: `
function add(a: number, b: number, c: number) { return a + b + c; }
const f = add.bind(null, 1);
console.log(f(2, 3), f.length, f.name);
const o = { v: 5, get() { return this.v; } };
const g = o.get.bind(o);
console.log(g(), g.name);
`,
  },
  {
    id: "c323-std-object-assign-and-getters",
    title: "Object.assign 与访问器：取的是值不是描述符",
    src: `
const src = { get a() { return 1; } };
const target: any = {};
Object.assign(target, src);
console.log(target.a, Object.getOwnPropertyDescriptor(target, "a").get === undefined);
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { y: 2 }, "ab")));
`,
  },
  {
    id: "c323-std-math-rounding-table",
    title: "Math 取整那一族的边界：负数、半值、-0",
    src: `
console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.9), Math.sign(-3), 1 / Math.sign(-0));
console.log(Math.min(), Math.max(), Math.min(0, -0), 1 / Math.min(0, -0));
`,
  },
  {
    id: "c323-std-string-trim-unicode",
    title: "trim 的空白表：非 ASCII 空格与零宽不换行空格",
    src: `
console.log("\\u00a0 x \\u00a0".trim().length, "\\u3000y\\u3000".trim() === "y");
console.log("\\ufeffz".trim() === "z", "a\\u2028".trimEnd() === "a", "\\u2009q".trimStart() === "q");
`,
  },
  {
    id: "c323-std-array-flat-and-with",
    title: "flat 的深度与 with / toSorted 的不可变形态",
    src: `
console.log([1, [2, [3, [4]]]].flat().join(","), [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
const xs = [3, 1, 2];
console.log(xs.with(0, 9).join(","), xs.toSorted().join(","), xs.toReversed().join(","), xs.join(","));
`,
  },
  {
    id: "c323-std-weakmap-and-weakset",
    title: "WeakMap / WeakSet：对象键、不可枚举、has/delete",
    src: `
const wm = new WeakMap();
const k1 = {};
wm.set(k1, 1);
console.log(wm.get(k1), wm.has(k1), wm.delete(k1), wm.has(k1));
const ws = new WeakSet([k1]);
console.log(ws.has(k1), Object.keys(ws).length);
`,
  },
  {
    id: "c323-std-number-formats",
    title: "数字格式化：toString 的基数、toFixed、指数与判别",
    src: `
console.log((255).toString(16), (8).toString(2), (1.5).toFixed(0), (1.005).toFixed(2));
console.log((1234.5).toExponential(2), (0.00012).toString());
console.log(Number.isInteger(1.0), Number.isFinite(Infinity), Number.isNaN(NaN), Number.parseInt("0x1f", 16));
`,
  },
  {
    id: "c323-std-global-parsing-functions",
    title: "parseInt / parseFloat / isNaN / isFinite 的全家",
    src: `
console.log(parseInt("12px"), parseInt("0x10"), parseInt("10", 2), parseInt(""), parseFloat("3.5x"));
console.log(isNaN("a"), Number.isNaN("a"), isFinite("1"), Number.isFinite("1"));
console.log(Number(""), Number(" "), Number("0b11"), String(1e21));
`,
  },
  {
    id: "c323-std-symbol-registry-and-description",
    title: "Symbol.for / keyFor / description 与 well-known 表",
    src: `
const s = Symbol.for("k");
console.log(Symbol.keyFor(s), s.description, Symbol.for("k") === s);
console.log(Symbol.iterator.description, typeof Symbol.asyncIterator, Symbol("x").description);
`,
  },
  {
    id: "c323-std-string-replace-and-split",
    title: "replace 的三种形态：字符串、$&、函数",
    src: `
console.log("a-b".replace("-", "+"), "aaa".replace("a", "$&$&"), "a1b2".replace("1", "#"));
console.log("a1b2".split("1").join("|"), "a,b,,c".split(",").length, "abc".split("").join("-"));
`,
  },
  {
    id: "c323-std-console-shapes",
    title: "console.log 的形状：容器、嵌套、函数与多实参",
    src: `
console.log([1, 2], { a: 1 }, [[1], [2]]);
console.log("s", 1, true, null, undefined);
console.log({ f: () => 1 }.f.name, [1, 2, 3].join());
`,
  },
  // ===== 第 330 轮收编（22 条）=====
  {
    id: "c330-std-string-wellformed",
    title: "`isWellFormed`：落单代理给假、正常串给真",
    src: `
console.log("abc".isWellFormed(), "\\uD800".isWellFormed(), "\\uD83D\\uDE00".isWellFormed());
console.log("a\\uDFFFb".isWellFormed());
`,
  },
  {
    id: "c330-std-string-towellformed",
    title: "`toWellFormed`：落单代理换成 U+FFFD、其余原样",
    src: `
const fixed = "a\\uD800b".toWellFormed();
console.log(fixed.length, fixed.charCodeAt(1).toString(16));
console.log("\\uD83D\\uDE00".toWellFormed() === "\\uD83D\\uDE00");
console.log("ok".toWellFormed());
`,
  },
  {
    id: "c330-std-promise-try-value",
    title: "`Promise.try`：同步返回值兑现",
    src: `
const p = Promise.try(() => 41 + 1);
p.then((v) => console.log("value", v));
console.log(typeof p.then);
`,
  },
  {
    id: "c330-std-promise-try-throw",
    title: "`Promise.try`：同步抛出的错变成拒绝",
    src: `
function boom(): number {
  throw new Error("nope");
}
Promise.try(boom).catch((e) => console.log("caught", (e as Error).message));
Promise.try(() => "ok").then((v) => console.log("then", v));
`,
  },
  {
    id: "c330-std-structuredclone-basic",
    title: "`structuredClone`：对象与数组是深拷贝",
    src: `
const source = { a: 1, b: { c: [1, 2, 3] } };
const copy = structuredClone(source);
copy.b.c.push(4);
copy.a = 9;
console.log(source.a, source.b.c.length, copy.a, copy.b.c.join(","));
`,
  },
  {
    id: "c330-std-structuredclone-containers",
    title: "`structuredClone`：Map / Set / Date 与循环引用",
    src: `
const map = new Map<string, number>([["a", 1]]);
const set = new Set<number>([1, 2]);
const date = new Date(0);
const cloned = structuredClone({ map, set, date });
console.log(cloned.map.get("a"), cloned.set.has(2), cloned.date.getTime());
const cyclic: any = { name: "root" };
cyclic.self = cyclic;
const copy = structuredClone(cyclic);
console.log(copy.name, copy.self === copy, copy.self.name);
`,
  },
  {
    id: "c330-std-error-iserror",
    title: "`Error.isError`：只有错误对象给真",
    src: `
console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
console.log(Error.isError({}), Error.isError("Error"), Error.isError(null));
`,
  },
  {
    id: "c330-std-number-tostring-edges",
    title: "数值 → 文本的几处边界写法",
    src: `
console.log((1e21).toString(), (1e-7).toString(), (0.000001).toString());
console.log((-0).toString(), (123456789012345680000).toString());
console.log((255).toString(16), (8).toString(2), (1.5).toString());
`,
  },
  {
    id: "c330-std-number-parse-edges",
    title: "`parseInt` / `parseFloat` 的前缀与失败形态",
    src: `
console.log(parseInt("  42px"), parseInt("0x1f"), parseInt("08"), parseInt("1e3"));
console.log(parseInt("z", 36), parseInt("-0"), Number.isNaN(parseInt("x")));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e2"));
`,
  },
  {
    id: "c330-std-json-stringify-control",
    title: "`JSON.stringify` 的控制字符与非 ASCII",
    src: `
console.log(JSON.stringify("a\\nb\\tc"));
console.log(JSON.stringify("\\u0001"));
console.log(JSON.stringify("中文😀"));
console.log(JSON.stringify({ k: "a\\"b" }));
`,
  },
  {
    id: "c330-std-json-parse-forms",
    title: "`JSON.parse` 的空白、指数与嵌套",
    src: `
console.log(JSON.parse('  { "a" : [ 1 , 2 ] }  ').a.join(","));
console.log(JSON.parse("1e3"), JSON.parse("-0.5"), JSON.parse("true"));
console.log(JSON.parse('{"n":{"m":[{"x":1}]}}').n.m[0].x);
`,
  },
  {
    id: "c330-std-array-sort-forms",
    title: "`sort` 的默认序与比较器形态",
    src: `
console.log([10, 9, 100, 1].sort().join(","));
console.log([10, 9, 100, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort(() => 0).join(","));
`,
  },
  {
    id: "c330-std-array-slice-splice-negative",
    title: "`slice` / `splice` 的负下标与返回值",
    src: `
const xs = [0, 1, 2, 3, 4];
console.log(xs.slice(-2).join(","), xs.slice(1, -1).join(","), xs.slice(3, 1).join(","));
const removed = xs.splice(-2, 1, 99);
console.log(removed.join(","), xs.join(","), xs.length);
`,
  },
  {
    id: "c330-std-string-split-forms",
    title: "`split` 的空分隔符、上限与连续分隔符",
    src: `
console.log("abc".split("").join("-"));
console.log("a,b,,c".split(",").length, "a,b,,c".split(",")[2]);
console.log("a-b-c".split("-", 2).join("|"));
console.log("".split(",").length, "abc".split("").length);
`,
  },
  {
    id: "c330-std-map-construct-forms",
    title: "`Map` 的构造、覆盖与迭代次序",
    src: `
const m = new Map<string, number>([["b", 2], ["a", 1], ["b", 3]]);
console.log(m.size, m.get("b"));
m.set("c", 4);
m.delete("a");
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map(([k, v]) => k + v).join("|"));
`,
  },
  {
    id: "c330-std-set-iterables",
    title: "`Set` 从各种可迭代对象构造",
    src: `
console.log([...new Set([1, 1, 2, 3, 3])].join(","));
console.log([...new Set("aabbc")].join(""));
console.log([...new Set(new Map([["x", 1], ["y", 2]]).keys())].join(","));
console.log(new Set([NaN, NaN]).size, new Set([0, -0]).size);
`,
  },
  {
    id: "c330-std-date-arithmetic",
    title: "`Date` 的算术、比较与 UTC 往返",
    src: `
const a = new Date(0);
const b = new Date(86400000);
console.log(b.getTime() - a.getTime(), b > a, a < b);
const iso = new Date(1700000000000).toISOString();
console.log(iso, Date.parse(iso));
console.log(Date.UTC(1970, 0, 2) / 86400000);
`,
  },
  {
    id: "c330-std-console-arrays-objects",
    title: "`console.log` 的数组与对象混排形状",
    src: `
console.log([], {}, [[]], [{}]);
console.log([1, "a", null, undefined, true]);
console.log({ a: [], b: {}, c: [[]] });
console.log([[1, 2], [3, 4]]);
`,
  },
  {
    id: "c330-std-function-call-forms",
    title: "`call` / `apply` / `bind` 的三种形态",
    src: `
function add(this: any, a: number, b: number): number {
  return this.base + a + b;
}
const ctx = { base: 10 };
console.log(add.call(ctx, 1, 2), add.apply(ctx, [3, 4]));
const bound = add.bind(ctx, 5);
console.log(bound(6), bound.length, bound.name);
`,
  },
  {
    id: "c330-std-error-subclass-forms",
    title: "自定义错误类：名字、消息与 `instanceof`",
    src: `
class ValidationError extends Error {
  field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
const e = new ValidationError("bad", "email");
console.log(e.name, e.message, e.field);
console.log(e instanceof ValidationError, e instanceof Error, e.constructor === ValidationError);
`,
  },
  {
    id: "c330-std-object-freeze-deep",
    title: "`Object.freeze` 的浅层语义与查询",
    src: `
const inner = { n: 1 };
const outer = { inner, list: [1] };
Object.freeze(outer);
outer.inner.n = 2;
console.log(outer.inner.n, Object.isFrozen(outer), Object.isFrozen(outer.inner));
console.log(Object.keys(outer).join(","));
`,
  },
  {
    id: "c330-std-math-round-ties",
    title: "`Math.round` / `Math.trunc` 在 .5 与负数上的口径",
    src: `
console.log(Math.round(0.5), Math.round(1.5), Math.round(-0.5), Math.round(-1.5));
console.log(Math.trunc(-1.7), Math.floor(-1.2), Math.ceil(-1.2));
console.log(Math.sign(-0), 1 / Math.sign(-0));
`,
  },
  // ===== 第 331 轮收编（13 条）=====
  {
    id: "c331-std-try-as-property-name",
    title: "`try` 当属性名：字面量键、成员读、成员写",
    src: `
const o = { try: 1, catch: 2, class: 3 };
console.log(o.try, o.catch, o.class);
const box: any = {};
box.try = 5;
console.log(box.try, box["try"]);
console.log(typeof Promise.try);
`,
  },
  {
    id: "c331-std-promise-try-forms",
    title: "`Promise.try`：同步值、多实参、异步返回值",
    src: `
console.log(typeof Promise.try);
Promise.try(() => 7).then((v) => console.log("sync", v));
Promise.try((a, b) => a * b, 6, 7).then((v) => console.log("args", v));
Promise.try(() => Promise.resolve("inner")).then((v) => console.log("adopt", v));
console.log("first");
`,
  },
  {
    id: "c331-std-promise-executor-throw",
    title: "执行器里抛：结果承诺被拒绝，后面的语句照样跑",
    src: `
new Promise(() => { throw new Error("boom"); }).catch((e) => console.log("caught", e.message));
console.log("after");
`,
  },
  {
    id: "c331-std-map-iterator-next-forms",
    title: "`Map` / `Set` 的 `keys()` / `values()` / `entries()` 手动推进",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2]]);
const k = m.keys();
console.log(k.next().value, k.next().value, k.next().done);
const v = m.values();
console.log(v.next().value, v.next().value);
const e = m.entries();
console.log(e.next().value.join(":"));
const s = new Set<string>(["x", "y"]);
console.log(s.keys().next().value, s.entries().next().value.join(""));
console.log([...m.keys()].join(","));
`,
  },
  {
    id: "c331-std-array-iterator-next-and-spread",
    title: "数组迭代器：`next()` 与展开是同一个来源",
    src: `
const xs = [10, 20, 30];
const it = xs.values();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
console.log([...xs.keys()].join(","), [...xs.entries()].map((p) => p.join(":")).join(" "));
console.log(Array.from(xs.values()).length);
`,
  },
  {
    id: "c331-std-json-stringify-nested-arrays-and-null",
    title: "`JSON.stringify` 的数组洞、null 与嵌套",
    src: `
console.log(JSON.stringify([1, null, undefined, 3]));
console.log(JSON.stringify({ a: [1, [2, [3]]], b: null }));
console.log(JSON.stringify(undefined), JSON.stringify(null), JSON.stringify(NaN));
`,
  },
  {
    id: "c331-std-object-entries-roundtrip",
    title: "`Object.entries` / `fromEntries` 往返与次序",
    src: `
const o = { b: 2, 1: "one", a: 1 };
const entries = Object.entries(o);
console.log(entries.map((p) => p[0] + "=" + p[1]).join(","));
console.log(JSON.stringify(Object.fromEntries(entries)));
console.log(Object.values(o).join(","), Object.keys(o).join(","));
`,
  },
  {
    id: "c331-std-array-flat-and-concat-forms",
    title: "`flat` 的深度与 `concat` 的嵌套形态",
    src: `
console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));
console.log(JSON.stringify([1].concat([2, 3], 4, [[5]])));
`,
  },
  {
    id: "c331-std-string-split-and-join-roundtrip",
    title: "字符串与数组之间的往返",
    src: `
const text = "a,b,,c";
console.log(JSON.stringify(text.split(",")));
console.log(text.split(",").join("|"));
console.log("  padded  ".trim().split(" ").join("-"));
console.log("a-b-c".split("-", 2).join("+"));
`,
  },
  {
    id: "c331-std-error-cause-and-instanceof",
    title: "错误链：`cause`、家族与 `instanceof`",
    src: `
const root = new TypeError("bad type");
const wrapped = new Error("outer", { cause: root });
console.log(wrapped.message, wrapped.cause.message);
console.log(wrapped instanceof Error, root instanceof TypeError, root instanceof Error);
console.log(wrapped.name, root.name);
`,
  },
  {
    id: "c331-std-date-and-number-formats",
    title: "`Date` 与数值格式化的几处日常写法",
    src: `
const d = new Date(0);
console.log(d.toISOString(), d.getTime(), Date.UTC(1970, 0, 1));
console.log((1234.5678).toFixed(2), (0.5).toFixed(0), (255).toString(16));
console.log(Number((1.005).toFixed(2)), (1000000).toString());
`,
  },
  {
    id: "c331-std-collection-size-and-clear",
    title: "`Map` / `Set` 的 `size` / `clear` / `delete` 返回值",
    src: `
const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log(m.size, m.delete("a"), m.delete("zz"), m.size);
m.clear();
console.log(m.size, [...m.keys()].length);
const s = new Set<number>([1, 2, 3]);
console.log(s.delete(2), s.has(2), s.size);
`,
  },
  {
    id: "c331-std-object-freeze-and-keys",
    title: "`Object.freeze` 之后键与查询",
    src: `
const o = { a: 1, b: 2 };
Object.freeze(o);
console.log(Object.isFrozen(o), Object.keys(o).join(","));
const nested = { inner: { n: 1 } };
Object.freeze(nested);
nested.inner.n = 5;
console.log(nested.inner.n, Object.isFrozen(nested.inner));
`,
  },
  // ===== 第 332 轮收编（4 条）=====
  {
    id: "c332-std-arguments-in-callbacks",
    title: "回调里的 `arguments`：重入那条路也要收",
    src: `
[1, 2, 3].forEach(function (x) {
  console.log(x, arguments.length, arguments[0]);
});
const mapped = [1, 2].map(function (x) {
  return arguments.length;
});
console.log(mapped.join(","));
queueMicrotask(function () {
  console.log("micro argc", arguments.length);
});
console.log("sync");
`,
  },
  {
    id: "c332-std-normalize-forms",
    title: "`normalize` 的四个形态与非法形态",
    src: `
const composed = "\\u00e9";
const decomposed = "e\\u0301";
console.log(composed.length, decomposed.length);
console.log(decomposed.normalize("NFC").length, decomposed.normalize("NFC") === composed);
console.log(composed.normalize("NFD").length, composed.normalize("NFD") === decomposed);
console.log("abc".normalize("NFKC"), "\\uFB01".normalize("NFKC"), "\\uFB01".length);
try {
  "abc".normalize("NFX");
} catch (e) {
  console.log((e as Error).name);
}
`,
  },
  {
    id: "c332-std-queue-microtask-forms",
    title: "`queueMicrotask` 的次序与嵌套",
    src: `
queueMicrotask(() => {
  console.log("a");
  queueMicrotask(() => console.log("a2"));
});
Promise.resolve().then(() => console.log("p"));
queueMicrotask(() => console.log("b"));
console.log("sync");
`,
  },
  {
    id: "c332-rt-arguments-and-named-expression",
    title: "`arguments` 与具名函数表达式写在同一个函数里",
    src: `
const f = function self(a: number, b: number) {
  return self.name + ":" + arguments.length + ":" + a;
};
console.log(f(1, 2, 3));
console.log(typeof self);
function g(x: number) {
  const inner = () => arguments.length + self2();
  function self2() { return 1; }
  return inner();
}
console.log(g(9));
`,
  },
  // ===== 第 334 轮收编（2 条）=====
  {
    id: "c334-std-function-tostring-and-primitive",
    title: "`f.toString()` 与 `f + 1` 各走一条路、读同一格",
    src: `
function named(a: number): number { return a + 1; }
const arrow = (n: number) => n;
console.log(typeof named.toString(), named.toString().includes("named"));
console.log(arrow.toString().startsWith("(n"), String(named) === named.toString());
console.log((named + 1).endsWith("1"), named.toString().indexOf("return a + 1") > 0);
const obj = { m() { return 1; } };
console.log(obj.m.toString().includes("m"), typeof obj.m.toString());
console.log([].push.toString().includes("native"), typeof (() => 1).toString());
`,
  },
  {
    id: "c334-std-object-tostring-not-shadowed",
    title: "`Object.prototype.toString` 不被 `Function.prototype.toString` 遮住",
    src: `
console.log(Object.prototype.toString.call([]), Object.prototype.toString.call({}));
console.log(Object.prototype.toString.call(1), Object.prototype.toString.call("x"));
console.log(Object.prototype.toString.call(null), Object.prototype.toString.call(undefined));
const f = function () { return 1; };
console.log(Object.prototype.toString.call(f));
console.log(Object.keys(Function.prototype).length, Object.keys(Object.prototype).length);
`,
  },
  // ===== 第 338 轮收编（1 条）=====
  {
    id: "c338-std-array-tostring-and-join",
    title: "`join` / `toString` 的每一格走它自己的 `toString`",
    src: `
const custom = { toString() { return "C!"; } };
const nested = [1, [2, 3]];
console.log([custom, 1].join("|"), [custom, 1].toString(), String([custom]));
console.log(nested.join("-"), nested.toString(), String(nested));
console.log([null, undefined, true].join(","), [1, , 3].join("-"));
class Box { toString() { return "box"; } }
console.log([new Box(), "x"].join("+"));
`,
  },
  // ===== 第 341 轮收编（1 条）=====
  {
    id: "c341-std-container-methods-live-on-prototype",
    title: "`Map` / `Set` / `Date` 的方法在原型上（不在实例上）",
    src: `
const m = new Map<string, number>([["a", 1]]);
const s = new Set<number>([1, 2]);
const d = new Date(0);
console.log(m.get === (Map.prototype as any).get, s.add === (Set.prototype as any).add,
  d.getTime === (Date.prototype as any).getTime);
console.log(typeof (Map.prototype as any).get, typeof (Set.prototype as any).has,
  typeof (Date.prototype as any).toISOString);
console.log(Object.keys(m).length, Object.keys(s).length, Object.keys(d).length);
const seen: string[] = [];
for (const k in m) seen.push(k);
for (const k in s) seen.push(k);
for (const k in d) seen.push(k);
console.log(seen.length);
console.log(m.get("a"), s.has(2), d.getTime());
m.set("b", 2); s.add(3); 
console.log(m.size, s.size, m.get("b"), s.has(3));
console.log(m instanceof Map, s instanceof Set, d instanceof Date, m instanceof Object);
const kind = Object.prototype.toString.call(m);
console.log(kind, String(m.get("a")));
`,
  },
  // ===== 第 343 轮收编（1 条）=====
  {
    id: "c343-std-error-iserror-and-this-rules",
    nodeArgs: ["--experimental-transform-types"],
    title: "`Error.isError` + `bind` / `super` 两条 `this` 规则各归各位",
    src: `
console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
console.log(Error.isError({}), Error.isError("Error"), Error.isError(null), Error.isError(undefined));
class MyErr extends Error {
  constructor(m: string, public code: number = 0) { super(m); this.name = "MyErr"; }
}
const e = new MyErr("boom", 7);
console.log(e.message, e.name, e.code, e instanceof Error, Error.isError(e), String(e));
const plain = Error("without new");
console.log(plain instanceof Error, Error.isError(plain), String(plain));
const obj = { tag: "obj", who(this: any) { return this === undefined ? "undef" : this.tag; } };
const bound = (obj.who as any).bind(obj);
console.log(bound(), bound.call({ tag: "other" }), obj.who());
function target(this: any, a: number, b: number) { return (this === undefined ? "u" : this.tag) + ":" + a + "," + b; }
const b2 = target.bind({ tag: "bound" }, 1);
console.log(b2(2), b2.call({ tag: "ignored" }, 3));
console.log(typeof Error.isError, Error.prototype.constructor === Error);
`,
  },

  // ===== 第 371 轮：加宽矩阵收编的候选（104 条）=====
  {
    "id": "c371-stdlib-string-at-forms",
    "title": "String.prototype.at：负数 / 越界 / 与 charAt 的分工",
    "src": "const s = \"hello\";\nconsole.log(s.at(0), s.at(-1), s.at(-5), s.at(5), s.at(-6));\nconsole.log(s.charAt(0), s.charAt(-1), s.charAt(5), JSON.stringify(s.charAt(5)));\nconsole.log(s.at(1.5), s.charAt(1.9));"
  },
  {
    "id": "c371-stdlib-string-slice-family-negatives",
    "title": "slice / substring / substr 三种负下标口径",
    "src": "const s = \"abcdef\";\nconsole.log(s.slice(-3), s.slice(1, -1), s.slice(-2, -1), s.slice(4, 2));\nconsole.log(s.substring(4, 2), s.substring(-2, 3), s.substring(2));\nconsole.log(s.substr(-2), s.substr(1, 3), s.substr(-10, 3));"
  },
  {
    "id": "c371-stdlib-string-pad-forms",
    "title": "padStart / padEnd：目标长度小于原长、填充串多字符",
    "src": "console.log(\"5\".padStart(3, \"0\"), \"5\".padEnd(3, \"0\"));\nconsole.log(\"abc\".padStart(2, \"0\"), \"abc\".padEnd(2, \"0\"));\nconsole.log(\"5\".padStart(6, \"ab\"), \"5\".padEnd(6, \"ab\"));\nconsole.log(\"x\".padStart(4), JSON.stringify(\"x\".padStart(4)));\nconsole.log(\"x\".padStart(4, \"\"), \"x\".padEnd(4, \"\"));"
  },
  {
    "id": "c371-stdlib-string-repeat-edge",
    "title": "repeat：0 次、小数、负数抛错",
    "src": "console.log(JSON.stringify(\"ab\".repeat(0)), \"ab\".repeat(1), \"ab\".repeat(3));\nconsole.log(\"ab\".repeat(2.9));\ntry { \"ab\".repeat(-1); } catch (e) { console.log((e as Error).name); }\nconsole.log(\"ab\".repeat(NaN).length);"
  },
  {
    "id": "c371-stdlib-string-index-of-forms",
    "title": "indexOf / lastIndexOf / includes / startsWith / endsWith 的起始位",
    "src": "const s = \"abcabc\";\nconsole.log(s.indexOf(\"a\"), s.indexOf(\"a\", 1), s.indexOf(\"z\"), s.indexOf(\"\"));\nconsole.log(s.lastIndexOf(\"a\"), s.lastIndexOf(\"a\", 2), s.lastIndexOf(\"z\"));\nconsole.log(s.includes(\"bc\"), s.includes(\"bc\", 3), s.startsWith(\"bc\", 1), s.endsWith(\"ab\", 5));"
  },
  {
    "id": "c371-stdlib-string-trim-whitespace-set",
    "title": "trim 家族：非 ASCII 空白与零宽字符",
    "src": "const s = \"\\u00a0\\u2028\\t x \\n\\u3000\";\nconsole.log(JSON.stringify(s.trim()), JSON.stringify(s.trimStart()), JSON.stringify(s.trimEnd()));\nconsole.log(JSON.stringify(\"\\u200b x\".trim()));\nconsole.log(\"\\uFEFFx\".trim().length);"
  },
  {
    "id": "c371-stdlib-string-case-forms",
    "title": "toUpperCase / toLowerCase / toLocale* 的边界",
    "src": "console.log(\"aBc\".toUpperCase(), \"AbC\".toLowerCase());\nconsole.log(\"ß\".toUpperCase(), \"İ\".toLowerCase().length);\nconsole.log(\"abc\".toLocaleUpperCase(), \"ABC\".toLocaleLowerCase());"
  },
  {
    "id": "c371-stdlib-string-replaceall-count",
    "title": "replaceAll：普通串、空串、与 replace 的差别",
    "src": "console.log(\"a-b-c\".replaceAll(\"-\", \"+\"));\nconsole.log(\"aaa\".replace(\"a\", \"b\"), \"aaa\".replaceAll(\"a\", \"b\"));\nconsole.log(\"abc\".replaceAll(\"\", \"-\"));\nconsole.log(\"x\".replaceAll(\"x\", \"$&$&\"));"
  },
  {
    "id": "c371-stdlib-string-concat-and-plus",
    "title": "String.prototype.concat 与 `+` 的结果一致",
    "src": "const s = \"a\";\nconsole.log(s.concat(\"b\", 1, true, null, undefined));\nconsole.log(s + \"b\" + 1 + true + null + undefined);\nconsole.log([...s.concat(\"bc\")].join(\"|\"));"
  },
  {
    "id": "c371-stdlib-string-codepoint-forms",
    "title": "codePointAt / fromCodePoint / 代理对",
    "src": "const s = \"a\\u{1F600}b\";\nconsole.log(s.length, [...s].length);\nconsole.log(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3));\nconsole.log(String.fromCodePoint(97), String.fromCodePoint(0x1f600).length);\nconsole.log(String.fromCharCode(0x1f600).length, String.fromCharCode(65, 66));\ntry { String.fromCodePoint(-1); } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-string-split-limit-and-empty",
    "title": "split：limit、空分隔串、capture-free 形态",
    "src": "console.log(JSON.stringify(\"a,b,c\".split(\",\", 2)));\nconsole.log(JSON.stringify(\"abc\".split(\"\")));\nconsole.log(JSON.stringify(\"\".split(\",\")), JSON.stringify(\"\".split(\"\")));\nconsole.log(JSON.stringify(\"a,,b\".split(\",\")));\nconsole.log(JSON.stringify(\"abc\".split(undefined as any)));"
  },
  {
    "id": "c371-stdlib-string-locale-compare",
    "title": "localeCompare 的符号与数字串",
    "src": "console.log(\"a\".localeCompare(\"b\") < 0, \"b\".localeCompare(\"a\") > 0, \"a\".localeCompare(\"a\"));\nconsole.log([\"b\", \"a\", \"c\"].sort((x, y) => x.localeCompare(y)).join(\"\"));\nconsole.log(\"10\".localeCompare(\"9\") < 0);"
  },
  {
    "id": "c371-stdlib-string-normalize",
    "title": "normalize 的 NFC / NFD / 无实参",
    "src": "const composed = \"\\u00e9\";\nconst decomposed = \"e\\u0301\";\nconsole.log(composed.length, decomposed.length);\nconsole.log(composed.normalize(\"NFD\").length, decomposed.normalize(\"NFC\").length);\nconsole.log(composed.normalize(\"NFC\") === composed, composed.normalize() === composed);\nconsole.log(decomposed.normalize(\"NFC\") === composed);"
  },
  {
    "id": "c371-stdlib-string-raw",
    "title": "String.raw 与标签模板的 raw 那一栏",
    "src": "console.log(String.raw`a\\nb`);\nfunction tag(parts: TemplateStringsArray, ...vals: unknown[]) {\n  console.log(parts.raw[0] === \"x\\\\ny\", parts.length, vals.join(\",\"));\n  return parts.join(\"|\");\n}\nconsole.log(tag`x\\ny${1}z${2}`);"
  },
  {
    "id": "c371-stdlib-array-at-and-negative",
    "title": "Array.prototype.at：负下标与越界",
    "src": "const xs = [1, 2, 3];\nconsole.log(xs.at(0), xs.at(-1), xs.at(-3), xs.at(3), xs.at(-4));\nconsole.log([].at(0));\nconsole.log(xs.at(-0), xs.at(1.9));"
  },
  {
    "id": "c371-stdlib-array-tospliced-and-reversed",
    "title": "toSpliced / toReversed / toSorted / with 不改原数组",
    "src": "const xs = [3, 1, 2];\nconsole.log(JSON.stringify(xs.toSorted()), JSON.stringify(xs.toSorted((a: number, b: number) => b - a)));\nconsole.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.with(1, 9)));\nconsole.log(JSON.stringify(xs.toSpliced(1, 1, 7, 8)));\nconsole.log(JSON.stringify(xs));\ntry { console.log(JSON.stringify(xs.with(9, 0))); } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-array-fill-and-copywithin-negative",
    "title": "fill / copyWithin 的负下标与越界夹取",
    "src": "console.log(JSON.stringify([1, 2, 3, 4].fill(0, 1, 3)));\nconsole.log(JSON.stringify([1, 2, 3, 4].fill(9, -2)));\nconsole.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(0, 3)));\nconsole.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(1, -2, -1)));\nconsole.log(JSON.stringify([1, 2, 3].copyWithin(0, 10)));"
  },
  {
    "id": "c371-stdlib-array-splice-return-and-argc",
    "title": "splice 的返回值与实参个数口径",
    "src": "const a = [1, 2, 3, 4];\nconsole.log(JSON.stringify(a.splice(1, 2)), JSON.stringify(a));\nconst b = [1, 2, 3];\nconsole.log(JSON.stringify(b.splice(1)), JSON.stringify(b));\nconst c = [1, 2, 3];\nconsole.log(JSON.stringify(c.splice(-1)), JSON.stringify(c));\nconst d = [1, 2, 3];\nconsole.log(JSON.stringify(d.splice()), JSON.stringify(d));"
  },
  {
    "id": "c371-stdlib-array-sort-stability-and-holes",
    "title": "sort：稳定性、undefined 排在最后、洞被移到尾部",
    "src": "const rows = [{ k: 1, n: \"a\" }, { k: 0, n: \"b\" }, { k: 1, n: \"c\" }, { k: 0, n: \"d\" }];\nconsole.log(rows.slice().sort((x, y) => x.k - y.k).map((r) => r.n).join(\"\"));\nconst mixed: any[] = [3, undefined, 1, , 2];\nconsole.log(JSON.stringify(mixed.slice().sort()));\nconsole.log(JSON.stringify([10, 9, 100].sort()));"
  },
  {
    "id": "c371-stdlib-array-from-mapfn-thisarg",
    "title": "Array.from：映射函数、类数组、可迭代、thisArg",
    "src": "console.log(Array.from(\"abc\").join(\"-\"));\nconsole.log(Array.from({ length: 3, 0: \"x\" } as any).map((v: any) => String(v)).join(\",\"));\nconsole.log(Array.from([1, 2, 3], (v: number) => v * 2).join(\",\"));\nconsole.log(Array.from(new Set([1, 1, 2])).join(\",\"));\nconsole.log(Array.from({ length: 2 }, (_: unknown, i: number) => i).join(\",\"));"
  },
  {
    "id": "c371-stdlib-array-reduce-empty-forms",
    "title": "reduce / reduceRight：空数组与初值的有无",
    "src": "console.log([1, 2, 3].reduce((a, b) => a + b));\nconsole.log([1, 2, 3].reduce((a, b) => a + b, 10));\nconsole.log([1, 2, 3].reduceRight((a, b) => a - b));\ntry { ([] as number[]).reduce((a, b) => a + b); } catch (e) { console.log((e as Error).name); }\nconsole.log(([] as number[]).reduce((a, b) => a + b, 5));\nconsole.log([1, , 3].reduce((a: number, b: number) => a + b, 0));"
  },
  {
    "id": "c371-stdlib-array-join-holes-and-nullish",
    "title": "join：洞与 undefined / null 都当空串，分隔串默认逗号",
    "src": "const xs: any[] = [1, , 3, undefined, null];\nconsole.log(JSON.stringify(xs.join()));\nconsole.log(JSON.stringify(xs.join(\"-\")));\nconsole.log(JSON.stringify(xs.toString()));\nconsole.log(JSON.stringify([].join(\"-\")), JSON.stringify([1].join()));"
  },
  {
    "id": "c371-stdlib-array-flat-depth-forms",
    "title": "flat / flatMap：深度、Infinity、洞",
    "src": "console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));\nconsole.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));\nconsole.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));\nconsole.log(JSON.stringify([1, [2, [3]]].flat(0)));\nconsole.log([1, 2].flatMap((v) => [v, v * 10]).join(\",\"));"
  },
  {
    "id": "c371-stdlib-array-every-some-empty",
    "title": "every / some / filter / find 在空数组与洞上的口径",
    "src": "console.log(([] as number[]).every((v) => v > 0), ([] as number[]).some((v) => v > 0));\nconsole.log([1, 2].every(Boolean), [0, 1].some(Boolean));\nconsole.log(JSON.stringify([1, , 3].filter((v: number) => v > 1)));\nconsole.log([1, , 3].find((v: number) => v === undefined), [1, , 3].findIndex((v: number) => v === undefined));"
  },
  {
    "id": "c371-stdlib-array-iterator-aliases",
    "title": "values / keys / entries 与 Symbol.iterator 是同一件东西",
    "src": "const xs = [\"a\", \"b\"];\nconsole.log([...xs.values()].join(\"\"), [...xs.keys()].join(\"\"), [...xs.entries()].map((e) => e.join(\":\")).join(\" \"));\nconsole.log(xs[Symbol.iterator] === xs.values);\nconst it = xs[Symbol.iterator]();\nconsole.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));"
  },
  {
    "id": "c371-stdlib-array-concat-forms",
    "title": "concat：非数组实参、洞的保留、Symbol.isConcatSpreadable 缺省",
    "src": "console.log(JSON.stringify([1].concat([2, 3], 4, \"ab\")));\nconsole.log(JSON.stringify([1].concat([[2], [3]])));\nconst xs: any[] = [1, , 3];\nconsole.log(xs.length, JSON.stringify(xs.concat([])));\nconsole.log(JSON.stringify([].concat(1, [2], [[3]])));"
  },
  {
    "id": "c371-stdlib-array-length-write-forms",
    "title": "length 的写：截断、放大成洞、非法值抛错",
    "src": "const xs = [1, 2, 3, 4];\nxs.length = 2;\nconsole.log(JSON.stringify(xs), xs.length);\nxs.length = 4;\nconsole.log(JSON.stringify(xs), xs.length, 2 in xs);\ntry { xs.length = -1; } catch (e) { console.log((e as Error).name); }\ntry { xs.length = 1.5; } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-array-index-and-length-key",
    "title": "下标键 / length 键 / 字符串键在数组上的分工",
    "src": "const xs: any[] = [1, 2, 3];\nxs[\"3\"] = 4;\nconsole.log(xs.length, JSON.stringify(xs));\nxs[\"01\"] = 5;\nconsole.log(xs.length, xs[\"01\"]);\nconsole.log(Object.keys(xs).join(\",\"));\nconsole.log(JSON.stringify(Object.keys([, , 1])));"
  },
  {
    "id": "c371-stdlib-object-keys-order-mixed",
    "title": "键的顺序：整数键在前、字符串键按插入、符号最后",
    "src": "const o: any = {};\no.b = 1; o[\"2\"] = 2; o.a = 3; o[\"1\"] = 4; o[\"01\"] = 5;\nconsole.log(Object.keys(o).join(\",\"));\no[Symbol(\"s\")] = 6;\nconsole.log(Object.keys(o).join(\",\"), Object.getOwnPropertySymbols(o).length);\nconsole.log(JSON.stringify(Object.entries(o)));"
  },
  {
    "id": "c371-stdlib-object-values-entries-primitive",
    "title": "Object.keys / values / entries 落在字符串与数字上",
    "src": "console.log(Object.keys(\"abc\").join(\",\"));\nconsole.log(JSON.stringify(Object.values(\"abc\")));\nconsole.log(JSON.stringify(Object.entries(\"ab\")));\nconsole.log(Object.keys(5).length, Object.keys(true).length, Object.keys(\"\").length);"
  },
  {
    "id": "c371-stdlib-object-assign-getters-and-order",
    "title": "Object.assign：读源上的 getter、写目标上的 setter、键的顺序",
    "src": "const src: any = {};\nObject.defineProperty(src, \"g\", { get() { return 7; }, enumerable: true });\nconst target: any = { a: 1 };\nObject.assign(target, src, { b: 2 });\nconsole.log(JSON.stringify(target));\nconst writes: string[] = [];\nconst sink: any = {};\nObject.defineProperty(sink, \"s\", { set(v: unknown) { writes.push(\"set:\" + v); }, enumerable: true });\nObject.assign(sink, { s: 9 });\nconsole.log(writes.join(\",\"));"
  },
  {
    "id": "c371-stdlib-object-create-null-and-descriptors",
    "title": "Object.create：null 原型、带属性描述符、链式原型",
    "src": "const bare = Object.create(null);\nbare.x = 1;\nconsole.log(typeof (bare as any).toString, Object.getPrototypeOf(bare));\nconst base = { greet() { return \"hi\"; } };\nconst child = Object.create(base, { n: { value: 5, enumerable: true, writable: true } });\nconsole.log(child.greet(), child.n, Object.keys(child).join(\",\"));\nconsole.log(Object.getPrototypeOf(child) === base);"
  },
  {
    "id": "c371-stdlib-object-defineproperty-accessor",
    "title": "defineProperty：访问器、不可写、不可枚举、getOwnPropertyDescriptor",
    "src": "const o: any = {};\nlet backing = 1;\nObject.defineProperty(o, \"v\", { get() { return backing; }, set(x: number) { backing = x * 2; }, enumerable: false, configurable: true });\no.v = 5;\nconsole.log(o.v, backing, Object.keys(o).length);\nconst d = Object.getOwnPropertyDescriptor(o, \"v\");\nconsole.log(typeof d.get, typeof d.set, d.enumerable, d.configurable);\nconsole.log(Object.getOwnPropertyDescriptor(o, \"nope\"));"
  },
  {
    "id": "c371-stdlib-object-descriptor-flags-array-vs-string",
    "title": "描述符标志：数组元素、length、字符串下标三套不同",
    "src": "const a = [1];\nconst d = Object.getOwnPropertyDescriptor(a, \"0\");\nconsole.log(d.writable, d.enumerable, d.configurable);\nconst dl = Object.getOwnPropertyDescriptor(a, \"length\");\nconsole.log(dl.writable, dl.enumerable, dl.configurable);\nconst ds = Object.getOwnPropertyDescriptor(\"ab\", \"0\");\nconsole.log(ds.writable, ds.enumerable, ds.configurable);"
  },
  {
    "id": "c371-stdlib-object-freeze-seal-write",
    "title": "freeze / seal / preventExtensions 之后的可写与可加",
    "src": "const f: any = { a: 1 };\nObject.freeze(f);\nf.a = 2;\nconsole.log(f.a, Object.isFrozen(f), Object.isSealed(f), Object.isExtensible(f));\nconst s: any = { a: 1 };\nObject.seal(s);\ns.a = 2;\ns.b = 3;\nconsole.log(s.a, s.b, Object.isSealed(s), Object.isFrozen(s));\nconst p: any = { a: 1 };\nObject.preventExtensions(p);\np.b = 2;\nconsole.log(p.b, Object.isExtensible(p), Object.isSealed(p));"
  },
  {
    "id": "c371-stdlib-object-getownpropertynames-vs-symbols",
    "title": "getOwnPropertyNames 与 getOwnPropertySymbols 的镜像关系",
    "src": "const o: any = { a: 1, 2: 2 };\no[Symbol(\"x\")] = 3;\nconsole.log(Object.getOwnPropertyNames(o).join(\",\"));\nconsole.log(Object.getOwnPropertySymbols(o).length);\nconst arr = [1, 2];\nconsole.log(Object.getOwnPropertyNames(arr).join(\",\"));"
  },
  {
    "id": "c371-stdlib-object-prototype-and-instanceof",
    "title": "getPrototypeOf / setPrototypeOf / isPrototypeOf / instanceof",
    "src": "const base = { kind: \"base\" };\nconst o: any = Object.create(base);\nconsole.log(Object.getPrototypeOf(o) === base, base.isPrototypeOf(o), o instanceof Object);\nconst other = {};\nObject.setPrototypeOf(other, base);\nconsole.log(other.kind, Object.getPrototypeOf(other) === base);\nconsole.log(Object.prototype.toString.call(o), Object.prototype.isPrototypeOf([]));"
  },
  {
    "id": "c371-stdlib-object-is-and-samevalue",
    "title": "Object.is：NaN / ±0 / 引用",
    "src": "const o = {};\nconsole.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is(-0, -0), Object.is(o, o), Object.is({}, {}));\nconsole.log(NaN === NaN, 0 === -0);\nconsole.log([NaN].includes(NaN), [0].includes(-0), [0].indexOf(-0));"
  },
  {
    "id": "c371-stdlib-object-hasown-and-in",
    "title": "Object.hasOwn / hasOwnProperty / in 三者口径",
    "src": "const proto = { inherited: 1 };\nconst o: any = Object.create(proto);\no.own = 2;\nconsole.log(Object.hasOwn(o, \"own\"), Object.hasOwn(o, \"inherited\"), Object.hasOwn(o, \"toString\"));\nconsole.log(o.hasOwnProperty(\"own\"), o.hasOwnProperty(\"inherited\"));\nconsole.log(\"inherited\" in o, \"toString\" in o, \"nope\" in o);\nconsole.log(Object.hasOwn([1], \"0\"), Object.hasOwn([1], \"length\"));"
  },
  {
    "id": "c371-stdlib-object-fromentries-and-roundtrip",
    "title": "Object.fromEntries 与 entries 的往返",
    "src": "const pairs: [string, number][] = [[\"a\", 1], [\"b\", 2]];\nconst o = Object.fromEntries(pairs);\nconsole.log(JSON.stringify(o), JSON.stringify(Object.entries(o)));\nconsole.log(JSON.stringify(Object.fromEntries(new Map([[\"k\", \"v\"]]))));\nconsole.log(JSON.stringify(Object.fromEntries([[\"x\", undefined], [\"y\", null]])));"
  },
  {
    "id": "c371-stdlib-object-groupby",
    "title": "Object.groupBy / Map.groupBy",
    "src": "const xs = [1, 2, 3, 4, 5];\nconst byParity = Object.groupBy(xs, (v: number) => (v % 2 === 0 ? \"even\" : \"odd\"));\nconsole.log(JSON.stringify(byParity));\nconst m = Map.groupBy(xs, (v: number) => v % 3);\nconsole.log([...m.entries()].map((e) => e[0] + \":\" + e[1].join(\"|\")).join(\" \"));"
  },
  {
    "id": "c371-stdlib-object-tostring-tags",
    "title": "Object.prototype.toString 的各类标签",
    "src": "const cases: unknown[] = [undefined, null, 1, \"s\", true, {}, [], () => 0, new Map(), new Set(), new Date(0), Symbol(\"x\")];\nconsole.log(cases.map((v) => Object.prototype.toString.call(v)).join(\" \"));\nclass C { get [Symbol.toStringTag]() { return \"Custom\"; } }\nconsole.log(Object.prototype.toString.call(new C()));"
  },
  {
    "id": "c371-stdlib-object-valueof-and-conversion",
    "title": "valueOf / toString 在强制转换里的顺序",
    "src": "const o = { valueOf() { return 3; }, toString() { return \"T\"; } };\nconsole.log(o + 1, String(o), `${o}`, Number(o));\nconst onlyToString = { toString() { return \"9\"; } };\nconsole.log(onlyToString + 1, Number(onlyToString));\nconst sym = { [Symbol.toPrimitive](hint: string) { return hint; } };\nconsole.log(`${sym}`, sym + \"\", +sym);"
  },
  {
    "id": "c371-stdlib-object-spread-getters",
    "title": "对象展开读的是值、不是描述符；getter 被求值一次",
    "src": "let reads = 0;\nconst src: any = {};\nObject.defineProperty(src, \"g\", { get() { reads = reads + 1; return reads; }, enumerable: true });\nconst copy = { ...src };\nconsole.log(copy.g, reads, Object.getOwnPropertyDescriptor(copy, \"g\").get);\nconst merged = { a: 1, ...{ a: 2, b: 3 }, b: 4 };\nconsole.log(JSON.stringify(merged));"
  },
  {
    "id": "c371-stdlib-number-constants-and-checks",
    "title": "Number 的常量与三个检查",
    "src": "console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.EPSILON > 0);\nconsole.log(Number.isInteger(5), Number.isInteger(5.5), Number.isInteger(-0), Number.isInteger(\"5\" as any));\nconsole.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53), Number.isFinite(1 / 0));\nconsole.log(Number.isNaN(NaN), Number.isNaN(\"NaN\" as any), isNaN(\"NaN\" as any));"
  },
  {
    "id": "c371-stdlib-number-parse-forms",
    "title": "Number() / parseInt / parseFloat 的分工",
    "src": "console.log(Number(\"\"), Number(\" 12 \"), Number(\"0x10\"), Number(\"1e3\"), Number(\"12px\"), Number(null as any), Number(true));\nconsole.log(parseInt(\"12px\"), parseInt(\"0x1f\"), parseInt(\"08\"), parseInt(\"101\", 2), parseInt(\"z\", 36), parseInt(\"\"));\nconsole.log(parseFloat(\"3.5x\"), parseFloat(\".5\"), parseFloat(\"1e2\"), parseFloat(\"Infinity\"));"
  },
  {
    "id": "c371-stdlib-number-tostring-radix-edge",
    "title": "toString(radix)：2 / 8 / 16 / 36 / 越界",
    "src": "console.log((255).toString(16), (255).toString(2), (8).toString(8), (35).toString(36));\nconsole.log((-255).toString(16), (0.5).toString(2));\ntry { (1).toString(1); } catch (e) { console.log((e as Error).name); }\ntry { (1).toString(37); } catch (e) { console.log((e as Error).name); }\nconsole.log((1.5).toString(), (1e21).toString(), (1e-7).toString());"
  },
  {
    "id": "c371-stdlib-number-tofixed-toprecision",
    "title": "toFixed / toPrecision / toExponential 的取舍与边界",
    "src": "console.log((1.005).toFixed(2), (2.5).toFixed(0), (-1.5).toFixed(0), (0).toFixed(3));\nconsole.log((123.456).toPrecision(4), (0.000123).toPrecision(2));\nconsole.log((12345).toExponential(2), (0.5).toExponential());\ntry { (1).toFixed(101); } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-number-valueof-and-wrapper",
    "title": "包装对象：new Number / valueOf / ==与===",
    "src": "const n = new Number(5);\nconsole.log(n.valueOf(), typeof n, n == 5 as any, n === (5 as any));\nconst s = new String(\"ab\");\nconsole.log(s.length, s.toUpperCase(), s + \"\", typeof s);\nconst b = new Boolean(false);\nconsole.log(b.valueOf(), b ? \"truthy\" : \"falsy\", !!b, Boolean(b));"
  },
  {
    "id": "c371-stdlib-math-rounding-boundaries",
    "title": "Math.round / floor / ceil / trunc 对 ±0.5 与负零",
    "src": "console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));\nconsole.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.5), Math.trunc(0.5));\nconsole.log(1 / Math.round(-0.5), 1 / Math.floor(-0), 1 / Math.ceil(-0.5));\nconsole.log(Math.round(4.5), Math.round(5.5), Math.round(1e21));"
  },
  {
    "id": "c371-stdlib-math-min-max-edge",
    "title": "min / max：空实参、NaN、±0",
    "src": "console.log(Math.min(), Math.max());\nconsole.log(Math.min(1, NaN), Math.max(1, NaN), Math.min(NaN, 1));\nconsole.log(1 / Math.min(0, -0), 1 / Math.max(-0, 0));\nconsole.log(Math.min(\"2\" as any, 3), Math.max(1, 2, 3));"
  },
  {
    "id": "c371-stdlib-math-pow-and-roots-edge",
    "title": "pow / sqrt / cbrt / hypot 的边界",
    "src": "console.log(Math.pow(2, 10), Math.pow(2, -1), Math.pow(-8, 1 / 3), Math.pow(1, Infinity));\nconsole.log(Math.sqrt(9), Math.sqrt(-1), 1 / Math.sqrt(0));\nconsole.log(Math.cbrt(27), Math.cbrt(-8), Math.hypot(3, 4), Math.hypot());\nconsole.log(Math.pow(NaN, 0), Math.pow(0, -1) === Infinity);"
  },
  {
    "id": "c371-stdlib-math-logs-and-exp",
    "title": "log / log2 / log10 / log1p / exp / expm1",
    "src": "console.log(Math.log(1), Math.log(0), Math.log(-1));\nconsole.log(Math.log2(8), Math.log10(1000), Math.log1p(0));\nconsole.log(Math.exp(0), Math.expm1(0), Math.log1p(Math.E - 1));\nconsole.log(Math.exp(1) === Math.E);"
  },
  {
    "id": "c371-stdlib-math-trig-hyperbolic",
    "title": "三角函数与双曲函数在 0 / π / 大值上的读数",
    "src": "console.log(Math.sin(0), Math.cos(0), Math.tan(0));\nconsole.log(Math.sin(Math.PI / 2), Math.cos(Math.PI));\nconsole.log(Math.asin(0), Math.acos(1), Math.atan(0), Math.atan2(0, -1) === Math.PI);\nconsole.log(Math.sinh(0), Math.cosh(0), Math.tanh(0));\nconsole.log(Math.asinh(0), Math.acosh(1), Math.atanh(0));\nconsole.log(Math.sin(Infinity), Math.atan2(0, 0));"
  },
  {
    "id": "c371-stdlib-math-imul-clz32-fround",
    "title": "imul / clz32 / fround / sign / trunc 的 32 位口径",
    "src": "console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0x7fffffff, 2));\nconsole.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000), Math.clz32(-1));\nconsole.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));\nconsole.log(Math.sign(-3), Math.sign(0), Math.sign(-0), Math.sign(NaN));\nconsole.log(Math.trunc(4.9), Math.trunc(-4.9));"
  },
  {
    "id": "c371-stdlib-json-stringify-undefined-forms",
    "title": "stringify：undefined / 函数 / 符号在对象与数组里的两种命运",
    "src": "console.log(JSON.stringify({ a: undefined, b: () => 0, c: Symbol(\"s\"), d: 1 }));\nconsole.log(JSON.stringify([undefined, () => 0, Symbol(\"s\"), 1]));\nconsole.log(JSON.stringify(undefined), JSON.stringify(() => 0), JSON.stringify(Symbol(\"s\")));\nconsole.log(JSON.stringify({ a: undefined }), JSON.stringify([undefined]));"
  },
  {
    "id": "c371-stdlib-json-stringify-tojson",
    "title": "stringify 里的 toJSON：Date、自定义对象、嵌套",
    "src": "console.log(JSON.stringify(new Date(0)));\nconsole.log(JSON.stringify({ d: new Date(86400000) }));\nconst o = { toJSON() { return { wrapped: true }; }, other: 1 };\nconsole.log(JSON.stringify(o), JSON.stringify({ nested: o }));\nconsole.log(JSON.stringify({ toJSON() { return undefined; } }));"
  },
  {
    "id": "c371-stdlib-json-stringify-replacer-forms",
    "title": "stringify 的 replacer：函数形态与数组形态",
    "src": "const o = { a: 1, b: 2, c: { d: 3 } };\nconsole.log(JSON.stringify(o, [\"a\", \"c\", \"d\"]));\nconsole.log(JSON.stringify(o, (k: string, v: unknown) => (k === \"b\" ? undefined : v)));\nconsole.log(JSON.stringify(o, (k: string, v: unknown) => (typeof v === \"number\" ? v * 10 : v)));\nconsole.log(JSON.stringify([1, 2], (_k: string, v: unknown) => (v === 1 ? undefined : v)));"
  },
  {
    "id": "c371-stdlib-json-stringify-indent-forms",
    "title": "stringify 的缩进实参：数字、字符串、超范围",
    "src": "console.log(JSON.stringify({ a: [1, 2] }, null, 2));\nconsole.log(JSON.stringify({ a: 1 }, null, \"\\t\"));\nconsole.log(JSON.stringify({ a: 1 }, null, 0));\nconsole.log(JSON.stringify({ a: 1 }, null, 11));"
  },
  {
    "id": "c371-stdlib-json-stringify-circular-and-specials",
    "title": "stringify：循环引用抛错、NaN / Infinity 成 null",
    "src": "const o: any = { a: 1 };\no.self = o;\ntry { JSON.stringify(o); } catch (e) { console.log((e as Error).name); }\nconsole.log(JSON.stringify({ n: NaN, i: Infinity, m: -Infinity }), JSON.stringify([NaN]));\nconsole.log(JSON.stringify({ s: \"\\u2028\\u2029\" }));"
  },
  {
    "id": "c371-stdlib-json-parse-forms",
    "title": "parse：空白、原始值、重复键、__proto__ 键",
    "src": "console.log(JSON.parse(\"  { \\\"a\\\" : 1 }  \").a);\nconsole.log(JSON.parse(\"null\"), JSON.parse(\"true\"), JSON.parse(\"1\"), JSON.parse(\"\\\"s\\\"\"));\nconsole.log(JSON.stringify(JSON.parse('{\"a\":1,\"a\":2}')));\nconst p = JSON.parse('{\"__proto__\":{\"x\":1}}') as any;\nconsole.log(p.x, Object.getPrototypeOf(p) === Object.prototype);\ntry { JSON.parse(\"{a:1}\"); } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-json-parse-reviver-forms",
    "title": "parse 的 reviver：自底向上、删除项、根的那一次",
    "src": "const seen: string[] = [];\nJSON.parse('{\"a\":{\"b\":1},\"c\":2}', (k, v) => { seen.push(k); return v; });\nconsole.log(seen.join(\",\"));\nconsole.log(JSON.stringify(JSON.parse('{\"a\":1,\"b\":2}', (k, v) => (k === \"b\" ? undefined : v))));\nconsole.log(JSON.stringify(JSON.parse('{\"a\":1}', (k, v) => (k === \"\" ? { root: v } : v))));"
  },
  {
    "id": "c371-stdlib-map-keys-identity-and-nan",
    "title": "Map 的键：NaN / ±0 / 对象身份 / 字符串与数字分开",
    "src": "const m = new Map<any, string>();\nm.set(NaN, \"nan\"); m.set(-0, \"zero\"); m.set(\"1\", \"str\"); m.set(1, \"num\");\nconsole.log(m.size, m.get(NaN), m.get(0), m.get(\"1\"), m.get(1));\nm.set(NaN, \"nan2\");\nconsole.log(m.size, m.get(NaN));\nconst k = {};\nm.set(k, \"obj\");\nconsole.log(m.get(k), m.get({}));"
  },
  {
    "id": "c371-stdlib-map-iteration-order-forms",
    "title": "Map 的迭代：插入序、删后重加排到末尾、forEach 三实参",
    "src": "const m = new Map([[\"a\", 1], [\"b\", 2], [\"c\", 3]]);\nm.delete(\"a\");\nm.set(\"a\", 9);\nconsole.log([...m.keys()].join(\",\"), [...m.values()].join(\",\"));\nconst rows: string[] = [];\nm.forEach((v, k, self) => rows.push(k + \"=\" + v + \"/\" + (self === m)));\nconsole.log(rows.join(\" \"));\nconsole.log([...m].map((e) => e.join(\":\")).join(\" \"), m.size);"
  },
  {
    "id": "c371-stdlib-map-constructor-sources",
    "title": "new Map 的几种来源与 clear / delete 的返回值",
    "src": "console.log(new Map([[\"a\", 1]]).size, new Map(Object.entries({ a: 1, b: 2 })).size);\nconsole.log(new Map(new Map([[\"x\", 1]])).get(\"x\"));\nconst empty = new Map();\nconsole.log(empty.delete(\"nope\"), empty.has(\"nope\"));\nconst m = new Map([[\"a\", 1], [\"b\", 2]]);\nconsole.log(m.delete(\"a\"), m.size);\nm.clear();\nconsole.log(m.size, [...m.keys()].length, m.get(\"b\"));"
  },
  {
    "id": "c371-stdlib-set-constructor-and-ops",
    "title": "Set：去重、NaN / ±0、迭代序、has 的返回值",
    "src": "const s = new Set<any>([1, 1, \"1\", NaN, NaN, -0, 0, null, undefined]);\nconsole.log(s.size, [...s].map((v) => String(v)).join(\",\"));\nconsole.log(s.has(NaN), s.has(0), s.has(-0), s.has(\"1\"));\nconst t = new Set(\"aabbc\");\nconsole.log([...t].join(\"\"), t.size);\nconsole.log(new Set([[1], [1]]).size);"
  },
  {
    "id": "c371-stdlib-map-set-size-and-keys",
    "title": "Map / Set 的 size 是访问器、Object.keys 看不到条目",
    "src": "const m = new Map([[\"a\", 1]]);\nconst s = new Set([1]);\nconsole.log(m.size, s.size, Object.keys(m as any).length, Object.keys(s as any).length);\nconst d = Object.getOwnPropertyDescriptor(Map.prototype, \"size\");\nconsole.log(typeof d!.get, d!.set === undefined, d!.enumerable);\nconsole.log(JSON.stringify(m), JSON.stringify(s));"
  },
  {
    "id": "c371-stdlib-promise-resolve-identity",
    "title": "Promise.resolve 的身份与 thenable 采纳",
    "src": "const p = Promise.resolve(1);\nconsole.log(Promise.resolve(p) === p);\nconst thenable = { then(res: (v: number) => void) { res(42); } };\nPromise.resolve(thenable as any).then((v) => console.log(\"thenable\", v));\nPromise.resolve(2).then((v) => console.log(\"plain\", v));\nconsole.log(\"sync-first\");"
  },
  {
    "id": "c371-stdlib-promise-all-mixed",
    "title": "Promise.all：非承诺项、空数组、一项拒绝",
    "src": "Promise.all([1, Promise.resolve(2), \"3\"]).then((vs) => console.log(\"all\", vs.join(\",\")));\nPromise.all([]).then((vs) => console.log(\"empty\", vs.length));\nPromise.all([Promise.resolve(1), Promise.reject(new Error(\"boom\")), Promise.resolve(3)])\n  .then(() => console.log(\"never\"))\n  .catch((e) => console.log(\"catch\", e.message));\nPromise.all([Promise.reject(new Error(\"first\")), Promise.reject(new Error(\"second\"))])\n  .catch((e) => console.log(\"which\", e.message));\nconsole.log(\"sync\");"
  },
  {
    "id": "c371-stdlib-promise-allsettled-any-race",
    "title": "allSettled / any / race 的形状",
    "src": "Promise.allSettled([Promise.resolve(1), Promise.reject(new Error(\"e\"))]).then((rs) => {\n  console.log(rs.map((r) => r.status + \":\" + (r.status === \"fulfilled\" ? r.value : r.reason.message)).join(\"|\"));\n});\nPromise.any([Promise.reject(new Error(\"a\")), Promise.resolve(\"ok\")]).then((v) => console.log(\"any\", v));\nPromise.any([Promise.reject(new Error(\"a\")), Promise.reject(new Error(\"b\"))])\n  .catch((e: any) => console.log(\"agg\", e.constructor.name, e.errors.length));\nPromise.race([Promise.resolve(\"fast\"), new Promise(() => {})]).then((v) => console.log(\"race\", v));"
  },
  {
    "id": "c371-stdlib-promise-finally-passthrough",
    "title": "finally：值透传、异常替换、返回承诺要等",
    "src": "Promise.resolve(1).finally(() => console.log(\"fin1\")).then((v) => console.log(\"v\", v));\nPromise.reject(new Error(\"orig\")).finally(() => console.log(\"fin2\")).catch((e) => console.log(\"c\", e.message));\nPromise.reject(new Error(\"orig3\"))\n  .finally(() => { throw new Error(\"replaced\"); })\n  .catch((e) => console.log(\"c3\", e.message));\nPromise.resolve(4).finally(() => Promise.resolve(9)).then((v) => console.log(\"wait\", v));"
  },
  {
    "id": "c371-stdlib-promise-executor-throw",
    "title": "执行器里同步抛错 = 拒绝；resolve 之后抛错被忽略",
    "src": "new Promise(() => { throw new Error(\"sync\"); }).catch((e) => console.log(\"caught\", e.message));\nnew Promise((res) => { res(1); throw new Error(\"late\"); }).then((v) => console.log(\"v\", v));\nnew Promise((res, rej) => { res(1); rej(new Error(\"second\")); }).then((v) => console.log(\"first-wins\", v));\nconsole.log(\"sync\");"
  },
  {
    "id": "c371-stdlib-promise-microtask-order",
    "title": "微任务顺序：then 链、await、queueMicrotask 的穿插",
    "src": "console.log(\"1\");\nPromise.resolve().then(() => console.log(\"2\"));\nqueueMicrotask(() => console.log(\"3\"));\nPromise.resolve().then(() => console.log(\"4\")).then(() => console.log(\"5\"));\nconsole.log(\"6\");\n(async () => { console.log(\"7\"); await null; console.log(\"8\"); })();\nconsole.log(\"9\");"
  },
  {
    "id": "c371-stdlib-date-now-and-construction",
    "title": "Date.now / new Date(ms) / new Date(string) 的读数",
    "src": "const t = new Date(0);\nconsole.log(t.getTime(), t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());\nconsole.log(new Date(\"2020-01-02T03:04:05.000Z\").getTime());\nconsole.log(new Date(2020, 0, 2).getFullYear(), typeof Date.now(), Date.now() > 0);\nconsole.log(new Date(NaN).getTime(), String(new Date(NaN)));"
  },
  {
    "id": "c371-stdlib-date-part-getters-utc",
    "title": "Date 的 getUTC* 一族与 toISOString 的往返",
    "src": "const d = new Date(Date.UTC(2021, 5, 7, 8, 9, 10, 11));\nconsole.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());\nconsole.log(d.getUTCDay(), d.toISOString());\nconsole.log(new Date(d.toISOString()).getTime() === d.getTime());"
  },
  {
    "id": "c371-stdlib-date-setters-and-overflow",
    "title": "setUTC* 的溢出进位与 Date.UTC 的月份口径",
    "src": "const d = new Date(Date.UTC(2021, 0, 31));\nd.setUTCMonth(1);\nconsole.log(d.toISOString());\nd.setUTCDate(d.getUTCDate() + 1);\nconsole.log(d.toISOString());\nconsole.log(new Date(Date.UTC(2021, 12, 1)).toISOString());\nconsole.log(new Date(Date.UTC(2021, 0, 0)).toISOString());"
  },
  {
    "id": "c371-stdlib-date-parse-and-json",
    "title": "Date.parse 与 toJSON；无效日期的字符串形态",
    "src": "console.log(Date.parse(\"1970-01-01T00:00:00.000Z\"), Date.parse(\"2020-01-01\"));\nconsole.log(JSON.stringify(new Date(0)), JSON.stringify({ at: new Date(86400000) }));\nconsole.log(JSON.stringify(new Date(NaN)));\nconsole.log(new Date(0).toJSON() === new Date(0).toISOString());"
  },
  {
    "id": "c371-stdlib-date-arithmetic",
    "title": "日期算术：差值、比较、克隆",
    "src": "const a = new Date(Date.UTC(2020, 0, 1));\nconst b = new Date(Date.UTC(2020, 0, 2));\nconsole.log((b.getTime() - a.getTime()) / 3600000, b > a, a < b, a.getTime() === b.getTime());\nconsole.log(new Date(a.getTime()).toISOString(), +a === a.getTime(), a - (0 as any) === a.getTime());"
  },
  {
    "id": "c371-stdlib-symbol-registry-and-keys",
    "title": "Symbol.for / keyFor / 作为键的唯一性",
    "src": "const a = Symbol.for(\"k\");\nconst b = Symbol.for(\"k\");\nconsole.log(a === b, Symbol.keyFor(a), Symbol(\"k\") === Symbol(\"k\"), Symbol.keyFor(Symbol(\"k\")));\nconst o: any = {};\no[a] = 1;\no[\"k\"] = 2;\nconsole.log(o[a], o[\"k\"], JSON.stringify(o), Object.keys(o).join(\",\"));\nconsole.log(Symbol.for(\"k\").toString(), a.description);"
  },
  {
    "id": "c371-stdlib-symbol-wellknown-forms",
    "title": "内建符号：iterator / toPrimitive / toStringTag / hasInstance",
    "src": "class Box {\n  [Symbol.toPrimitive](hint: string) { return hint === \"number\" ? 1 : \"box\"; }\n}\nconst b = new Box();\nconsole.log(b + \"\", +b as any, `${b}`, String(b));\nclass Tag { get [Symbol.toStringTag]() { return \"Tagged\"; } }\nconsole.log(Object.prototype.toString.call(new Tag()));\nconsole.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.hasInstance);"
  },
  {
    "id": "c371-stdlib-symbol-species-and-hasinstance",
    "title": "Symbol.hasInstance 与 Symbol.species 的缺省语义",
    "src": "class Even {\n  static [Symbol.hasInstance](v: unknown) { return typeof v === \"number\" && (v as number) % 2 === 0; }\n}\nconsole.log(2 instanceof (Even as any), 3 instanceof (Even as any));\nclass MyArray extends Array {}\nconst out = new MyArray().concat([1]);\nconsole.log(out instanceof MyArray, out instanceof Array, (MyArray as any)[Symbol.species] === MyArray);"
  },
  {
    "id": "c371-stdlib-error-families-and-fields",
    "title": "Error 家族：name / message / instanceof / cause",
    "src": "const errs = [new Error(\"e\"), new TypeError(\"t\"), new RangeError(\"r\"), new SyntaxError(\"s\"), new ReferenceError(\"ref\"), new EvalError(\"ev\"), new URIError(\"u\")];\nconsole.log(errs.map((e) => e.name).join(\",\"));\nconsole.log(errs.map((e) => e instanceof Error).join(\",\"));\nconsole.log(new TypeError(\"t\") instanceof TypeError, new TypeError(\"t\") instanceof RangeError);\nconst withCause = new Error(\"outer\", { cause: new Error(\"inner\") });\nconsole.log((withCause as any).cause.message, String(new Error(\"x\")));\nconsole.log(new Error().message === \"\", new Error(\"m\").toString());"
  },
  {
    "id": "c371-stdlib-error-subclass-shapes",
    "title": "自定义错误子类：name / instanceof / 捕获",
    "src": "class AppError extends Error {\n  code: number;\n  constructor(message: string, code: number) {\n    super(message);\n    this.name = \"AppError\";\n    this.code = code;\n  }\n}\nclass NotFound extends AppError {\n  constructor(what: string) { super(\"missing \" + what, 404); this.name = \"NotFound\"; }\n}\ntry { throw new NotFound(\"file\"); } catch (e) {\n  const err = e as NotFound;\n  console.log(err.name, err.message, err.code, err instanceof NotFound, err instanceof AppError, err instanceof Error);\n}\nconsole.log(String(new AppError(\"m\", 1)));"
  },
  {
    "id": "c371-stdlib-error-print-and-types",
    "title": "错误对象的枚举键与 name 的可写性",
    "src": "const e = new Error(\"boom\");\nconsole.log(Object.keys(e).join(\",\"), e.message, e.name);\ne.name = \"Custom\";\nconsole.log(e.name, String(e));\nconsole.log(JSON.stringify({ err: new Error(\"x\") }));\nconsole.log(e.propertyIsEnumerable(\"message\"), e.propertyIsEnumerable(\"name\"));"
  },
  {
    "id": "c371-stdlib-console-log-shapes",
    "title": "console.log 的多实参、嵌套对象与数组",
    "src": "console.log(\"a\", 1, true, null, undefined);\nconsole.log({ a: 1, b: { c: [1, 2] } });\nconsole.log([1, [2, [3]]]);\nconsole.log({ arr: [], obj: {}, fn: () => 0, sym: Symbol(\"s\"), big: undefined });\nconsole.log(\"nested\", { s: \"x\", n: NaN, i: Infinity, neg: -0 });"
  },
  {
    "id": "c371-stdlib-console-log-numbers",
    "title": "console.log 的数字打印口径",
    "src": "console.log(1, 1.5, -0, 1 / 3, 1e21, 1e-7, NaN, Infinity, -Infinity);\nconsole.log(0.1 + 0.2, 2 ** 53, -(2 ** 53));\nconsole.log(Number.MAX_VALUE, Number.MIN_VALUE);\nconsole.log(255, -255, 0.000001, 1000000000000000000000);"
  },
  {
    "id": "c371-stdlib-function-bind-forms",
    "title": "Function.prototype.bind：偏实参、this、new、length/name",
    "src": "function add(a: number, b: number, c: number) { return a + b + c; }\nconst one = add.bind(null, 1);\nconsole.log(one(2, 3), one.length, one.name);\nconst ctx = { base: 10, add(this: any, x: number) { return this.base + x; } };\nconst bound = ctx.add.bind({ base: 100 });\nconsole.log(bound(1), ctx.add(1));\nfunction Point(this: any, x: number) { this.x = x; }\nconst BoundPoint = Point.bind(null);\nconsole.log(new (BoundPoint as any)(5).x);"
  },
  {
    "id": "c371-stdlib-function-call-apply",
    "title": "call / apply 的 this 与类数组实参",
    "src": "function describe(this: any, a: number, b: number) { return this.tag + \":\" + a + \":\" + b; }\nconsole.log(describe.call({ tag: \"c\" }, 1, 2));\nconsole.log(describe.apply({ tag: \"a\" }, [3, 4]));\nconsole.log(Math.max.apply(null, [1, 5, 3] as any));\nconst args = { length: 2, 0: \"x\", 1: \"y\" };\nconsole.log(describe.apply({ tag: \"like\" }, args as any));"
  },
  {
    "id": "c371-stdlib-function-tostring-and-name",
    "title": "函数对象的 toString / name / length 三个内省口",
    "src": "function named(a: number, b: number) { return a + b; }\nconsole.log(named.name, named.length, named.toString().startsWith(\"function named\"));\nconst arrow = (x: number) => x;\nconsole.log(arrow.name, arrow.length);\nconst obj = { m() { return 0; }, get g() { return 1; } };\nconsole.log(obj.m.name, Object.getOwnPropertyDescriptor(obj, \"g\")!.get!.name);\nconsole.log((function () { return 0; }).name === \"\", typeof Function.prototype);"
  },
  {
    "id": "c371-stdlib-globals-uri-family",
    "title": "encodeURI / decodeURI / encodeURIComponent 的差别",
    "src": "const s = \"a b/c?d=e&f+g\";\nconsole.log(encodeURI(s));\nconsole.log(encodeURIComponent(s));\nconsole.log(decodeURI(encodeURI(s)) === s, decodeURIComponent(encodeURIComponent(s)) === s);\nconsole.log(encodeURIComponent(\"\\u00e9\\u4e2d\"));\ntry { decodeURIComponent(\"%\"); } catch (e) { console.log((e as Error).name); }"
  },
  {
    "id": "c371-stdlib-globals-coercion-table",
    "title": "全局强制转换：Number / String / Boolean 的一览",
    "src": "const vals: any[] = [undefined, null, true, false, 0, -0, 1, \"\", \"x\", \"0\", \" 1 \", [], [1], [1, 2], {}, NaN];\nconsole.log(vals.map((v) => String(v)).join(\"|\"));\nconsole.log(vals.map((v) => (v ? 1 : 0)).join(\"\"));\nconsole.log(vals.map((v) => Number(v)).join(\",\"));"
  },
  {
    "id": "c371-stdlib-globals-parse-family",
    "title": "parseInt / parseFloat / isNaN / isFinite 的松散口径",
    "src": "console.log(isNaN(NaN), isNaN(\"abc\" as any), isNaN(\"\" as any), isNaN(undefined as any), isNaN(null as any));\nconsole.log(isFinite(\"1\" as any), isFinite(\"\" as any), isFinite(null as any), isFinite(Infinity));\nconsole.log(parseInt(\"0b101\" as any), parseInt(\"10\", 16), parseFloat(\" 3.5 \"), parseFloat(\"-.5\"));"
  },
  {
    "id": "c371-stdlib-string-iterator-codepoints",
    "title": "字符串迭代按码点、下标按码元（两把尺子的差别）",
    "src": "const s = \"a\\u{1F600}b\";\nconsole.log(s.length, [...s].length, Array.from(s).length);\nconsole.log([...s].map((c) => c.length).join(\",\"));\nfor (const ch of s) console.log(\"ch\", ch.length);\nconsole.log(s[1], s[2], s.slice(1, 3).length);"
  },
  {
    "id": "c371-stdlib-map-set-weak-free-spread",
    "title": "把 Map / Set 摊开成数组的几种写法",
    "src": "const m = new Map([[\"a\", 1], [\"b\", 2]]);\nconsole.log(JSON.stringify([...m]), JSON.stringify(Array.from(m)));\nconst s = new Set([1, 2]);\nconsole.log([...s].join(\",\"), JSON.stringify(Array.from(s, (v: number) => v * 2)));\nconst o = Object.fromEntries(m);\nconsole.log(JSON.stringify(o));\nconsole.log([...m.values()].reduce((a, b) => a + b, 0));"
  },
  {
    "id": "c371-stdlib-array-from-iterable-forms",
    "title": "Array.from 吃下各种可迭代对象",
    "src": "console.log(Array.from(new Map([[\"a\", 1]])).length, JSON.stringify(Array.from(new Map([[\"a\", 1]]))));\nconsole.log(Array.from(new Set(\"abc\")).join(\"-\"));\nfunction* gen() { yield 1; yield 2; }\nconsole.log(Array.from(gen()).join(\",\"));\nconst custom = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } };\nconsole.log(Array.from(custom as any).join(\",\"));"
  },
  {
    "id": "c371-stdlib-object-tostring-on-builtins",
    "title": "内建对象的 toString 与 valueOf 的组合",
    "src": "console.log(String([]), String([1, 2]), String([null, 1]), String({}));\nconsole.log([1, 2] + \"\", [] + 1, [5] * 2);\nconsole.log(String(new Map()), String(new Set()), String(new Date(0)).length > 0);\nconsole.log(String(new Error(\"e\")), String(new TypeError(\"t\")));"
  },
  {
    "id": "c371-stdlib-json-nested-roundtrip",
    "title": "JSON 往返：嵌套结构、特殊数字、空容器",
    "src": "const data = { a: [1, { b: [2, 3] }], c: { d: null }, e: [], f: {}, g: \"s\" };\nconst text = JSON.stringify(data);\nconsole.log(text);\nconsole.log(JSON.stringify(JSON.parse(text)) === text);\nconsole.log(JSON.stringify([{}, [], null, 0, \"\"]), JSON.stringify({ a: 0, b: \"\" }));"
  },
  {
    "id": "c371-stdlib-string-split-join-roundtrip",
    "title": "split / join 的往返与空项",
    "src": "const parts = \"a,,b,\".split(\",\");\nconsole.log(JSON.stringify(parts), parts.join(\"|\"), parts.length);\nconsole.log(JSON.stringify(\"a b  c\".split(\" \")), JSON.stringify(\"a b  c\".split(\" \", 2)));\nconsole.log(\"a,b\".split(\",\", 0).length, \"abc\".split(\"\", 2).join(\"-\"));"
  },
  {
    "id": "c371-stdlib-object-keys-shadowing",
    "title": "遮蔽内建原型方法与 Object.keys 的自有性",
    "src": "const o: any = { toString: () => \"own\", valueOf: () => 7 };\nconsole.log(String(o), o + 1, Object.prototype.toString.call(o));\nconsole.log(Object.keys(o).join(\",\"), \"toString\" in o, Object.hasOwn(o, \"toString\"));\nconst d: any = Object.create(null);\nd.k = 1;\nconsole.log(Object.keys(d).join(\",\"), typeof d.toString);"
  },
  {
    "id": "c371-stdlib-array-of-and-isarray",
    "title": "Array.of / Array.isArray / new Array 的三种构造",
    "src": "console.log(JSON.stringify(Array.of(1, 2)), JSON.stringify(Array.of(3)), JSON.stringify(Array.of()));\nconsole.log(JSON.stringify(new Array(3)), new Array(3).length, JSON.stringify(new Array(1, 2)));\nconsole.log(Array.isArray([]), Array.isArray(\"ab\" as any), Array.isArray(new Array(0)));\nconsole.log(Array.isArray(Array.prototype), JSON.stringify([...new Array(3)]));"
  },
  {
    "id": "c371-stdlib-string-match-free-forms",
    "title": "不含正则的字符串查找：search 之外的手段",
    "src": "const text = \"alpha beta gamma\";\nconsole.log(text.split(\" \").indexOf(\"beta\"), text.indexOf(\"beta\") > 0);\nconsole.log(text.split(\" \").filter((w) => w.includes(\"a\")).join(\",\"));\nconsole.log(text.split(\" \").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(\" \"));\nconsole.log(text.split(\" \").some((w) => w.startsWith(\"g\")), text.split(\" \").find((w) => w.length > 4));"
  },
  {
    "id": "c371-stdlib-number-format-via-string",
    "title": "不靠 Intl 的数字格式化：toFixed + 千分位",
    "src": "function group(n: number): string {\n  const s = Math.abs(n).toFixed(2);\n  const dot = s.indexOf(\".\");\n  let int = s.slice(0, dot);\n  const frac = s.slice(dot);\n  let out = \"\";\n  while (int.length > 3) {\n    out = \",\" + int.slice(int.length - 3) + out;\n    int = int.slice(0, int.length - 3);\n  }\n  return (n < 0 ? \"-\" : \"\") + int + out + frac;\n}\nconsole.log(group(1234567.891), group(-12.5), group(0), group(999.999));"
  },
  {
    "id": "c371-stdlib-array-tostring-forms",
    "title": "数组的 toString / join 在嵌套与稀疏上的读数",
    "src": "console.log(String([[1, 2], [3]]), [[1, 2], [3]].join(\";\"));\nconsole.log(JSON.stringify([1, null, undefined, , 2].join(\"-\")));\nconsole.log([1, [2, [3]]].toString());\nconsole.log(String([]), String([, ,]));"
  },
  {
    "id": "c371-stdlib-string-pad-in-table",
    "title": "用 padEnd / padStart 对齐一列文本",
    "src": "const rows = [[\"id\", \"name\"], [\"1\", \"alice\"], [\"22\", \"bob\"]];\nfor (const [a, b] of rows) console.log(a.padStart(3) + \" | \" + b.padEnd(6) + \"|\");\nconsole.log(rows.map((r) => r[1].padEnd(8, \".\")).join(\"\"));\nconsole.log(\"header\".padEnd(10, \"=\"));"
  },

  // ===== 第 376 轮：给修好的形状补的判据（4 条）=====
  {
    "id": "c376-stdlib-error-families-seven",
    "title": "七个错误族 + `decodeURIComponent` 抛出来的名字",
    "src": "const errs = [new Error(\"e\"), new TypeError(\"t\"), new RangeError(\"r\"), new SyntaxError(\"s\"),\n  new ReferenceError(\"ref\"), new EvalError(\"ev\"), new URIError(\"u\")];\nconsole.log(\"A\", errs.map((e) => e.name).join(\",\"));\nconsole.log(\"B\", errs.map((e) => e instanceof Error).join(\",\"));\nconsole.log(\"C\", new TypeError(\"t\") instanceof TypeError, new TypeError(\"t\") instanceof RangeError);\nconsole.log(\"D\", new URIError(\"u\") instanceof URIError, new EvalError(\"e\") instanceof EvalError);\nconsole.log(\"E\", new URIError(\"x\").message, String(new EvalError(\"boom\")), new URIError(\"u\").constructor === URIError);\ntry { decodeURIComponent(\"%\"); } catch (e) { console.log(\"F\", (e as Error).name, (e as Error).message); }\ntry { decodeURIComponent(\"%zz\"); } catch (e) { console.log(\"G\", (e as Error).name); }\ntry { decodeURI(\"%\"); } catch (e) { console.log(\"H\", (e as Error).name); }\ntry { decodeURI(\"%E4%B8\"); } catch (e) { console.log(\"I\", (e as Error).name); }\nconsole.log(\"J\", decodeURIComponent(\"%E4%B8%AD\"), decodeURIComponent(\"a%20b\"), encodeURIComponent(\"\\u00e9\\u4e2d\"));"
  },
  {
    "id": "c376-stdlib-array-holes-per-method",
    "title": "洞按方法分：find 访问、some 跳过、indexOf 跳过、includes 算 undefined",
    "src": "const holes: any[] = [1, , 3];\nconsole.log(\"A find\", holes.find((v) => v === undefined), \"findIndex\", holes.findIndex((v) => v === undefined));\nconsole.log(\"B findLast\", holes.findLast((v) => v === undefined), \"findLastIndex\", holes.findLastIndex((v) => v === undefined));\nconsole.log(\"C some\", holes.some((v) => v === undefined), \"every\", holes.every((v) => v !== undefined));\nlet calls = 0;\nholes.forEach(() => { calls += 1; });\nconsole.log(\"D forEach calls\", calls);\nconsole.log(\"E indexOf\", holes.indexOf(undefined), \"lastIndexOf\", holes.lastIndexOf(undefined), \"includes\", holes.includes(undefined));\nconsole.log(\"F join\", holes.join(\"-\"), \"length\", holes.length, \"in\", 1 in holes);"
  },
  {
    "id": "c376-stdlib-splice-argument-forms",
    "title": "`splice` 的实参个数口径：不给 / 给一个 / 给 undefined",
    "src": "const a = [1, 2, 3, 4];\nconsole.log(\"A\", JSON.stringify(a.splice()), JSON.stringify(a));\nconst b = [1, 2, 3];\nconsole.log(\"B\", JSON.stringify(b.splice(1)), JSON.stringify(b));\nconst c = [1, 2, 3];\nconsole.log(\"C\", JSON.stringify(c.splice(1, undefined)), JSON.stringify(c));\nconst d = [1, 2, 3];\nconsole.log(\"D\", JSON.stringify(d.splice(1, 0, 9)), JSON.stringify(d));\nconst e = [1, 2, 3];\nconsole.log(\"E\", JSON.stringify(e.splice(-2)), JSON.stringify(e));\nconst f = [1, 2, 3];\nconsole.log(\"F\", JSON.stringify(f.splice(5)), JSON.stringify(f));\nconst g = [1, 2, 3];\nconsole.log(\"G\", JSON.stringify(g.splice(0, 99)), JSON.stringify(g));"
  },
  {
    "id": "c376-stdlib-array-length-range",
    "title": "`length` 的写：截断 / 放大成洞 / 非法值抛 RangeError",
    "src": "const xs: any[] = [1, 2, 3, 4];\nxs.length = 2;\nconsole.log(\"A\", JSON.stringify(xs), xs.length);\nxs.length = 4;\nconsole.log(\"B\", JSON.stringify(xs), xs.length, 2 in xs);\ntry { xs.length = -1; } catch (e) { console.log(\"C\", (e as Error).name); }\ntry { xs.length = 1.5; } catch (e) { console.log(\"D\", (e as Error).name); }\ntry { xs.length = 4294967296; } catch (e) { console.log(\"E\", (e as Error).name); }\nconsole.log(\"F\", xs.length);\nconst obj: any = { length: 3 };\nconsole.log(\"G\", obj.length, Array.from({ length: 3 }, (_v, i) => i).join(\",\"));"
  },

  // ===== 第 377 轮：给修好的形状补的判据（3 条）=====
  {
    "id": "c377-stdlib-object-keys-primitives",
    "title": "`Object.keys/values/entries` 收原始值：数字与布尔给空、null 与 undefined 抛",
    "src": "console.log(\"A\", Object.keys(\"abc\").join(\",\"), JSON.stringify(Object.values(\"abc\")));\nconsole.log(\"B\", JSON.stringify(Object.entries(\"ab\")), Object.keys(\"\").length);\nconsole.log(\"C\", Object.keys(5).length, Object.keys(true).length, Object.keys(5.5).length);\nconsole.log(\"D\", JSON.stringify(Object.values(7)), JSON.stringify(Object.entries(false)));\ntry { Object.keys(null as any); } catch (e) { console.log(\"E\", (e as Error).name); }\ntry { Object.values(undefined as any); } catch (e) { console.log(\"F\", (e as Error).name); }\ntry { Object.entries(null as any); } catch (e) { console.log(\"G\", (e as Error).name); }\nconsole.log(\"H\", Object.keys({ 3: \"c\", 1: \"a\", \"b\": 2 }).join(\",\"));"
  },
  {
    "id": "c377-stdlib-function-apply-array-like",
    "title": "`Function.prototype.apply` 认类数组（含 `length` 是数字文本 + `arguments`）",
    "src": "function f(this: any, a: number, b: number) { return [this.tag, a, b].join(\":\"); }\nconsole.log(\"A\", f.apply({ tag: \"T\" }, [1, 2]));\nconsole.log(\"B\", f.apply({ tag: \"T\" }, { length: 2, 0: 1, 1: 2 } as any));\nconsole.log(\"C\", f.apply({ tag: \"T\" }, { length: \"2\", 0: 1, 1: 2 } as any));\nconsole.log(\"D\", f.apply({ tag: \"T\" }, { length: 0 } as any));\nconsole.log(\"E\", f.apply({ tag: \"T\" }, { length: 5, 0: 1 } as any));\nfunction viaArguments(): string { return f.apply({ tag: \"A\" }, arguments as any); }\nconsole.log(\"F\", viaArguments(7, 8));\nconsole.log(\"G\", f.apply({ tag: \"T\" }, [] as any), f.call({ tag: \"C\" }, 3, 4));"
  },
  {
    "id": "c377-stdlib-promise-resolve-identity",
    "title": "`Promise.resolve` 的身份：已经是本族承诺就原样交回（thenable 那一半还没做）",
    "src": "const p = Promise.resolve(1);\nconsole.log(\"A\", Promise.resolve(p) === p, Promise.resolve(1) === Promise.resolve(1));\nconst q = p.then((v) => v + 1);\nconsole.log(\"B\", Promise.resolve(q) === q);\nconst nested = Promise.resolve(p);\nconsole.log(\"C\", nested === p, nested === q);\nPromise.resolve(5).then((v) => console.log(\"D\", v));\n// 这一半还没做：Promise.resolve(thenable) 在 JS 里会**叫一次 then** ✓、\n// 用它结清的那个值兑现 ✓（本仓把 thenable **本身**当成值收下了 ✓）。记在台账里。\nconst thenable = { then(resolve: any) { resolve(2); } };\nconsole.log(\"E\", Promise.resolve(thenable) === thenable);"
  },
  // ============ 第 623 轮加宽：内建面与语言语义的边角（普查 tmp/cand-623.mjs，64 条全过）============
  {
    id: "c623-date-set-utc",
    title: "Date.setUTC* 三件：分 / 秒 / 毫秒（含进位）",
    src: "\nconst d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));\nd.setUTCMinutes(30);\nd.setUTCSeconds(7);\nd.setUTCMilliseconds(8);\nconsole.log(d.toISOString());\nconst e = new Date(Date.UTC(2020, 0, 2, 3, 59, 59, 999));\ne.setUTCMinutes(60);\ne.setUTCSeconds(60);\ne.setUTCMilliseconds(1000);\nconsole.log(e.toISOString());\n",
  },
  {
    id: "c623-date-set-local",
    title: "Date.setHours / setMinutes / setSeconds / setMilliseconds",
    src: "\nconst d = new Date(2020, 0, 2, 3, 4, 5, 6);\nd.setHours(10);\nd.setMinutes(11);\nd.setSeconds(12);\nd.setMilliseconds(13);\nconsole.log(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());\n",
  },
  {
    id: "c623-date-static",
    title: "Date.now / parse / UTC 与 Date.UTC 的越界归一",
    src: "\nconsole.log(Date.UTC(2020, 12, 1));\nconsole.log(Date.UTC(2020, 0, 32));\nconsole.log(typeof Date.now() === \"number\");\nconsole.log(Date.parse(\"2020-01-02T03:04:05.006Z\"));\n",
  },
  {
    id: "c623-string-tolocale",
    title: "String.toLocaleUpperCase / toLocaleLowerCase（无 locale 时等同大小写）",
    src: "\nconsole.log(\"aBc\".toLocaleUpperCase(), \"aBc\".toLocaleLowerCase());\nconsole.log(\"İ\".toLocaleLowerCase().length, \"ß\".toLocaleUpperCase());\n",
  },
  {
    id: "c623-number-tofixed",
    title: "Number.toFixed / toPrecision / toExponential（含进位与负数）",
    src: "\nconsole.log((1.005).toFixed(2), (2.5).toFixed(0), (-1.5).toFixed(1), (0).toFixed(3));\nconsole.log((123.456).toPrecision(4), (0.000123).toExponential(2));\n",
  },
  {
    id: "c623-array-copywithin-fill",
    title: "Array.copyWithin / fill：负下标与越界",
    src: "\nconst a = [1, 2, 3, 4, 5];\nconsole.log(a.copyWithin(0, 3).join(\",\"));\nconsole.log(a.copyWithin(1, -2).join(\",\"));\nconsole.log([1, 2, 3].fill(9, -2).join(\",\"));\nconsole.log([1, 2, 3].fill(0, 5).join(\",\"));\n",
  },
  {
    id: "c623-array-findlast-tosorted",
    title: "Array.findLast / findLastIndex / toSorted / toReversed / with",
    src: "\nconst a = [5, 1, 4, 2];\nconsole.log(a.findLast((x) => x % 2 === 0), a.findLastIndex((x) => x > 3));\nconsole.log(a.toSorted((x, y) => x - y).join(\",\"), a.join(\",\"));\nconsole.log(a.toReversed().join(\",\"), a.with(1, 9).join(\",\"), a.join(\",\"));\n",
  },
  {
    id: "c623-object-descriptors",
    title: "Object.getOwnPropertyNames / getOwnPropertyDescriptor / defineProperty",
    src: "\nconst o: any = { a: 1 };\nObject.defineProperty(o, \"b\", { value: 2, enumerable: false, writable: true, configurable: true });\nconsole.log(Object.getOwnPropertyNames(o).join(\",\"));\nconsole.log(Object.getOwnPropertyDescriptor(o, \"b\").value, Object.getOwnPropertyDescriptor(o, \"b\").enumerable);\nconsole.log(Object.keys(o).join(\",\"));\n",
  },
  {
    id: "c623-object-frozen-sealed",
    title: "Object.isFrozen / isSealed / preventExtensions / getPrototypeOf",
    src: "\nconst a = Object.freeze({ x: 1 });\nconst b = Object.seal({ y: 2 });\nconsole.log(Object.isFrozen(a), Object.isSealed(a), Object.isFrozen(b), Object.isSealed(b));\nconsole.log(Object.isExtensible(a), Object.isExtensible({}));\nconsole.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf({}) === Object.prototype);\n",
  },
  {
    id: "c623-object-from-entries",
    title: "Object.fromEntries / Object.entries 往返",
    src: "\nconst o = Object.fromEntries([[\"a\", 1], [\"b\", 2]]);\nconsole.log(JSON.stringify(o));\nconsole.log(Object.entries({ x: 1, y: 2 }).map(([k, v]) => k + v).join(\",\"));\n",
  },
  {
    id: "c623-symbol-for-keyfor",
    title: "Symbol.for / keyFor / description / toString",
    src: "\nconst s = Symbol.for(\"k\");\nconsole.log(Symbol.keyFor(s), Symbol.for(\"k\") === s, Symbol.keyFor(Symbol(\"z\")));\nconsole.log(Symbol(\"d\").description, String(Symbol(\"d\")), Symbol(\"d\").toString());\n",
  },
  {
    id: "c623-symbol-hasinstance",
    title: "instanceof 走 Symbol.hasInstance",
    src: "\nclass Even {\n  static [Symbol.hasInstance](x: any) { return typeof x === \"number\" && x % 2 === 0; }\n}\nconsole.log(2 instanceof Even, 3 instanceof Even);\n",
  },
  {
    id: "c623-map-set-iteration",
    title: "Map / Set 的 values / keys / entries / forEach 与插入序",
    src: "\nconst m = new Map<string, number>([[\"b\", 2], [\"a\", 1]]);\nconsole.log([...m.keys()].join(\",\"), [...m.values()].join(\",\"));\nconsole.log([...m.entries()].map(([k, v]) => k + v).join(\",\"));\nm.forEach((v, k) => console.log(k, v));\nconst s = new Set([3, 1, 3, 2]);\nconsole.log([...s].join(\",\"), [...s.entries()].map((e) => e.join(\":\")).join(\",\"));\n",
  },
  {
    id: "c623-json-reviver-replacer",
    title: "JSON.parse 的 reviver 与 JSON.stringify 的 replacer / space",
    src: "\nconst o = JSON.parse('{\"a\":1,\"b\":{\"c\":2}}', (k, v) => (typeof v === \"number\" ? v * 10 : v));\nconsole.log(JSON.stringify(o));\nconsole.log(JSON.stringify({ a: 1, b: 2 }, [\"a\"]));\nconsole.log(JSON.stringify({ a: [1, 2] }, null, 2).split(\"\\n\").length);\n",
  },
  {
    id: "c623-json-tojson",
    title: "JSON.stringify 走 toJSON",
    src: "\nconst o = { toJSON() { return { z: 1 }; } };\nconsole.log(JSON.stringify(o));\nconsole.log(JSON.stringify({ d: new Date(0) }));\n",
  },
  {
    id: "c623-string-split-limit",
    title: "String.split 的 limit 与空串分隔",
    src: "\nconsole.log(\"a,b,c\".split(\",\", 2).join(\"|\"));\nconsole.log(\"abc\".split(\"\").join(\"-\"));\nconsole.log(\"\".split(\",\").length, \"a\".split(\",\").length);\n",
  },
  {
    id: "c623-string-concat-repeat",
    title: "String.concat / repeat / padStart / padEnd / at",
    src: "\nconsole.log(\"a\".concat(\"b\", \"c\"), \"ab\".repeat(3), \"x\".padStart(3, \"0\"), \"x\".padEnd(3, \"-\"));\nconsole.log(\"abc\".at(-1), \"abc\".at(0), \"abc\".at(5));\n",
  },
  {
    id: "c623-string-codepoint",
    title: "String.codePointAt / fromCodePoint（补充平面）",
    src: "\nconsole.log(\"😀\".codePointAt(0), String.fromCodePoint(128512) === \"😀\");\nconsole.log(\"abc\".codePointAt(1), String.fromCodePoint(98));\n",
  },
  {
    id: "c623-string-normalize",
    title: "String.normalize 的四种形式",
    src: "\nconst s = \"\\u00e9\";\nconsole.log(s.normalize(\"NFC\") === s, s.normalize(\"NFD\").length, s.normalize().length);\nconsole.log(\"\\u0041\\u030a\".normalize(\"NFC\"), \"\\u00c5\".normalize(\"NFD\").length);\n",
  },
  {
    id: "c623-error-subclass",
    title: "Error 子类：name / message / instanceof / cause",
    src: "\nclass MyError extends Error { constructor(m: string) { super(m); this.name = \"MyError\"; } }\nconst e = new MyError(\"boom\");\nconsole.log(e.name, e.message, e instanceof MyError, e instanceof Error);\nconst w = new Error(\"outer\", { cause: new Error(\"inner\") } as any);\nconsole.log((w as any).cause.message);\n",
  },
  {
    id: "c623-error-families",
    title: "各错误族构造：TypeError / RangeError / ReferenceError / SyntaxError / URIError / EvalError",
    src: "\nconst list: any[] = [TypeError, RangeError, ReferenceError, SyntaxError, URIError, EvalError, AggregateError];\nconsole.log(list.map((C) => C.name).join(\",\"));\nconsole.log(new TypeError(\"t\").message, new RangeError().message === \"\", new TypeError(\"t\") instanceof Error);\n",
  },
  {
    id: "c623-math-edges",
    title: "Math 边角：clz32 / imul / fround / hypot / cbrt / sign / trunc / log2",
    src: "\nconsole.log(Math.clz32(1), Math.imul(3, 4), Math.fround(1.5), Math.hypot(3, 4));\nconsole.log(Math.cbrt(27), Math.sign(-0), Math.trunc(-1.7), Math.log2(8), Math.log10(1000));\nconsole.log(Math.min(), Math.max(), Math.min(1, NaN));\n",
  },
  {
    id: "c623-math-rounding",
    title: "Math.round / floor / ceil 的负数与 -0",
    src: "\nconsole.log(Math.round(-0.5), Object.is(Math.round(-0.5), -0), Math.round(0.5));\nconsole.log(Math.floor(-0.5), Math.ceil(-0.5), Math.floor(-1.5), Math.ceil(-1.5));\n",
  },
  {
    id: "c623-array-from-map",
    title: "Array.from 的映射函数与类数组 / iterable",
    src: "\nconsole.log(Array.from([1, 2], (x) => x * 2).join(\",\"));\nconsole.log(Array.from(\"ab\").join(\",\"));\nconsole.log(Array.from(new Set([1, 2])).join(\",\"), Array.from({ length: 2 }, (_: any, i: number) => i).join(\",\"));\n",
  },
  {
    id: "c623-array-of",
    title: "Array.of 与构造器单数字参数的分野",
    src: "\nconsole.log(Array.of(3).length, Array.of(3).join(\",\"), new Array(3).length);\nconsole.log(Array.of(1, 2).join(\",\"), Array.isArray([]), Array.isArray(\"x\"));\n",
  },
  {
    id: "c623-object-assign-spread",
    title: "Object.assign 与对象展开的覆盖序",
    src: "\nconst a = Object.assign({ x: 1 }, { x: 2 }, { y: 3 });\nconsole.log(JSON.stringify(a));\nconsole.log(JSON.stringify({ ...a, z: 4, ...{ y: 9 } }));\n",
  },
  {
    id: "c623-object-create",
    title: "Object.create 的原型链与 hasOwnProperty",
    src: "\nconst proto = { greet() { return \"hi\"; } };\nconst o: any = Object.create(proto);\no.x = 1;\nconsole.log(o.greet(), o.hasOwnProperty(\"x\"), o.hasOwnProperty(\"greet\"));\nconsole.log(Object.getPrototypeOf(o) === proto, \"greet\" in o);\n",
  },
  {
    id: "c623-class-accessors",
    title: "类的 getter / setter / static 访问器",
    src: "\nclass C {\n  private _v = 0;\n  get v() { return this._v; }\n  set v(x: number) { this._v = x * 2; }\n  static get tag() { return \"C\"; }\n}\nconst c = new C();\nc.v = 5;\nconsole.log(c.v, C.tag);\n",
  },
  {
    id: "c623-class-private",
    title: "类的 #私有字段 / #私有方法 / static #",
    src: "\nclass C {\n  static #n = 1;\n  #m = 2;\n  #inc() { return this.#m + 1; }\n  static get() { return C.#n; }\n  run() { return this.#inc(); }\n}\nconsole.log(C.get(), new C().run());\n",
  },
  {
    id: "c623-class-static-block",
    title: "类的 static {} 初始化块（按顺序跑）",
    src: "\nclass C {\n  static a: number;\n  static b: number;\n  static { C.a = 1; }\n  static { C.b = C.a + 1; }\n}\nconsole.log(C.a, C.b);\n",
  },
  {
    id: "c623-class-computed-members",
    title: "类的计算成员名与 Symbol.iterator",
    src: "\nconst key = \"m\";\nclass C {\n  [key]() { return 1; }\n  static [Symbol.iterator]() { return [1, 2][Symbol.iterator](); }\n}\nconsole.log(new C().m(), [...C].join(\",\"));\n",
  },
  {
    id: "c623-object-literal-accessors",
    title: "对象字面量的 getter / setter / 简写 / 计算键",
    src: "\nlet store = 0;\nconst k = \"dyn\";\nconst o = {\n  a: 1,\n  get g() { return store; },\n  set g(v: number) { store = v; },\n  [k]: 2,\n  m() { return this.a; },\n};\no.g = 7;\nconsole.log(o.g, o.dyn, o.m(), Object.keys(o).join(\",\"));\n",
  },
  {
    id: "c623-spread-rest",
    title: "展开与剩余：调用 / 数组 / 对象 / 形参",
    src: "\nfunction f(a: number, ...rest: number[]) { return a + rest.length; }\nconsole.log(f(...[1, 2, 3]));\nconst [x, ...ys] = [1, 2, 3];\nconst { p, ...qs } = { p: 1, q: 2, r: 3 };\nconsole.log(x, ys.join(\",\"), JSON.stringify(qs));\nconsole.log(Math.max(...[1, 9, 3]));\n",
  },
  {
    id: "c623-destructuring-defaults",
    title: "解构的默认值与嵌套 + 重命名",
    src: "\nconst { a = 1, b: { c = 2 } = {}, d: e = 3 } = { b: {} } as any;\nconsole.log(a, c, e);\nconst [p = 10, [q = 20] = []] = [] as any;\nconsole.log(p, q);\n",
  },
  {
    id: "c623-optional-call-chain",
    title: "可选链的三档（属性 / 下标 / 调用）与空值合并",
    src: "\nconst o: any = { a: { b: () => 1 }, m: null };\nconsole.log(o?.a?.b?.(), o?.m?.[0] ?? \"d\", o?.z?.y ?? \"e\");\nconsole.log(o.a?.b?.(), (null as any)?.x);\n",
  },
  {
    id: "c623-logical-assignment",
    title: "逻辑赋值 ??= ||= &&= 的短路与返回",
    src: "\nlet a: any = null;\na ??= 1; a ??= 2;\nlet b: any = 0;\nb ||= 3; b &&= 4;\nconsole.log(a, b);\nconst o: any = {};\no.x ??= \"y\";\nconsole.log(o.x);\n",
  },
  {
    id: "c623-labeled-statements",
    title: "标签 + break / continue 跨层",
    src: "\nouter: for (let i = 0; i < 3; i++) {\n  for (let j = 0; j < 3; j++) {\n    if (j === 1) continue outer;\n    if (i === 2) break outer;\n    console.log(i, j);\n  }\n}\n",
  },
  {
    id: "c623-generator-protocol",
    title: "生成器：next 的 value/done、return、throw、委托",
    src: "\nfunction* g() { yield 1; yield 2; return 3; }\nconst it = g();\nconsole.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));\nfunction* h() { yield* [1, 2]; yield 3; }\nconsole.log([...h()].join(\",\"));\nfunction* k() { try { yield 1; } finally { console.log(\"fin\"); } }\nconst i2 = k();\ni2.next();\nconsole.log(JSON.stringify(i2.return(9)));\n",
  },
  {
    id: "c623-async-await-forms",
    title: "async / await：try-finally、串行、返回值",
    src: "\nasync function f() {\n  try { return await Promise.resolve(1); } finally { console.log(\"f-finally\"); }\n}\nasync function main() {\n  console.log(await f());\n  const xs = [1, 2, 3];\n  let sum = 0;\n  for (const x of xs) sum += await Promise.resolve(x);\n  console.log(sum);\n}\nmain();\nconsole.log(\"sync\");\n",
  },
  {
    id: "c623-promise-combinators",
    title: "Promise.all / allSettled / race / any 的形状",
    src: "\nPromise.all([1, Promise.resolve(2)]).then((v) => console.log(\"all\", v.join(\",\")));\nPromise.allSettled([Promise.resolve(1), Promise.reject(new Error(\"x\"))]).then((r) =>\n  console.log(\"settled\", r.map((x: any) => x.status).join(\",\")));\nPromise.race([Promise.resolve(\"a\")]).then((v) => console.log(\"race\", v));\nPromise.any([Promise.reject(new Error(\"y\")), Promise.resolve(\"b\")]).then((v) => console.log(\"any\", v));\n",
  },
  {
    id: "c623-promise-thenable",
    title: "thenable 的吸收与 then 的链式返回",
    src: "\nconst thenable = { then(res: any) { res(7); } };\nPromise.resolve(thenable as any).then((v) => console.log(\"thenable\", v));\nPromise.resolve(1).then((v) => v + 1).then((v) => console.log(\"chain\", v));\n",
  },
  {
    id: "c623-try-finally-control",
    title: "try / catch / finally 里的 return / break / continue",
    src: "\nfunction f() { try { return 1; } finally { console.log(\"fin\"); } }\nconsole.log(f());\nfor (let i = 0; i < 2; i++) { try { continue; } finally { console.log(\"loop-fin\", i); } }\ntry { throw new Error(\"e\"); } catch (e: any) { console.log(\"caught\", e.message); } finally { console.log(\"end\"); }\n",
  },
  {
    id: "c623-switch-fallthrough",
    title: "switch 的贯穿、default 居中、块级 case",
    src: "\nfunction f(x: number) {\n  switch (x) {\n    case 1:\n    case 2:\n      return \"12\";\n    default:\n      return \"d\";\n    case 3:\n      return \"3\";\n  }\n}\nconsole.log(f(1), f(2), f(3), f(9));\n",
  },
  {
    id: "c623-for-in-order",
    title: "for..in 的键序（整数键在前）与原型链",
    src: "\nconst o: any = { b: 1, 2: 2, a: 3, 1: 4 };\nconst keys: string[] = [];\nfor (const k in o) keys.push(k);\nconsole.log(keys.join(\",\"));\nconst proto = { p: 1 };\nconst child: any = Object.create(proto);\nchild.c = 2;\nconst ks: string[] = [];\nfor (const k in child) ks.push(k);\nconsole.log(ks.join(\",\"));\n",
  },
  {
    id: "c623-in-operator",
    title: "in：数组下标 / 原型链 / 空位",
    src: "\nconst a = [1, , 3];\nconsole.log(0 in a, 1 in a, 2 in a, 3 in a, \"length\" in a, \"push\" in a);\nconsole.log(\"toString\" in {}, \"z\" in { z: undefined });\n",
  },
  {
    id: "c623-instanceof-chain",
    title: "instanceof 跨继承链与 Function.prototype",
    src: "\nclass A {}\nclass B extends A {}\nclass C extends B {}\nconst c = new C();\nconsole.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);\nconsole.log(A instanceof Function, (() => {}) instanceof Function, [] instanceof Array);\n",
  },
  {
    id: "c623-getter-this-binding",
    title: "访问器里的 this 与解构取值",
    src: "\nconst o = {\n  v: 1,\n  get doubled() { return this.v * 2; },\n};\nconst { doubled } = o;\nconsole.log(o.doubled, doubled);\nconst f = o.doubled;\nconsole.log(f);\n",
  },
  {
    id: "c623-method-extraction",
    title: "方法取出后 this 丢失 + bind / call / apply",
    src: "\nclass C {\n  v = 5;\n  m(this: any) { return this.v; }\n}\nconst c = new C();\nconsole.log(c.m(), c.m.call({ v: 9 }), c.m.apply({ v: 8 }, []));\nconst bound = c.m.bind({ v: 7 });\nconsole.log(bound(), bound.call({ v: 1 }));\n",
  },
  {
    id: "c623-arrow-this",
    title: "箭头函数的 this 词法绑定与 class 字段箭头",
    src: "\nclass C {\n  v = 3;\n  f = () => this.v;\n  g() { return (() => this.v)(); }\n}\nconst c = new C();\nconst f = c.f;\nconsole.log(f(), c.g(), c.f.call({ v: 9 }));\n",
  },
  {
    id: "c623-console-render",
    title: "console.log 的多实参渲染（对象 / 数组 / 嵌套 / 函数）",
    src: "\nconsole.log({ a: 1, b: [1, 2], c: { d: null } });\nconsole.log([1, [2, [3]]], [], {});\nconsole.log(\"s\", 1, true, null, undefined, Symbol(\"y\"));\nconsole.log(function named() {}, class Named {});\n",
  },
  {
    id: "c623-number-parsing",
    title: "parseInt / parseFloat / Number 的边角",
    src: "\nconsole.log(parseInt(\"0x1f\"), parseInt(\"12px\"), parseInt(\"-3\"), parseInt(\"z\", 36));\nconsole.log(parseFloat(\"1.5e2\"), parseFloat(\".5\"), parseFloat(\"x\"));\nconsole.log(Number(\"\"), Number(\" 12 \"), Number(\"x\"), Number(true), Number(null));\n",
  },
  {
    id: "c623-number-is-methods",
    title: "Number.isInteger / isFinite / isNaN / isSafeInteger / EPSILON",
    src: "\nconsole.log(Number.isInteger(1.0), Number.isInteger(\"1\"), Number.isSafeInteger(2 ** 53));\nconsole.log(Number.isFinite(Infinity), globalThis.isFinite(\"1\" as any));\nconsole.log(Number.isNaN(NaN), Number.EPSILON > 0, Number.MAX_SAFE_INTEGER);\n",
  },
  {
    id: "c623-template-tag",
    title: "标签模板：strings 的 raw 与多段拼接",
    src: "\nfunction tag(strings: TemplateStringsArray, ...vals: any[]) {\n  return strings.join(\"|\") + \"#\" + vals.join(\",\");\n}\nconsole.log(tag`a${1}b${2}c`);\nconsole.log(tag`z`);\n",
  },
  {
    id: "c623-comma-sequence",
    title: "逗号表达式与赋值链的返回值",
    src: "\nlet a = 0;\nlet b = (a = 1, a + 1);\nconsole.log(a, b);\nlet x: number, y: number;\nx = y = 5;\nconsole.log(x, y);\n",
  },
  {
    id: "c623-void-delete",
    title: "void / delete 的返回值与副作用",
    src: "\nconst o: any = { a: 1 };\nconsole.log(void 0, delete o.a, o.a, delete (o as any).z);\nconst arr = [1, 2, 3];\ndelete arr[1];\nconsole.log(arr.length, 1 in arr);\n",
  },
  {
    id: "c623-bitwise-coercion",
    title: "位运算的 32 位截断与无符号右移",
    src: "\nconsole.log(2147483648 | 0, -1 >>> 0, 1 << 31, (1 << 31) >>> 0);\nconsole.log(5 & 3, 5 | 3, 5 ^ 3, ~0, 1.9 | 0, \"3\" | 0, NaN | 0);\n",
  },
  {
    id: "c623-exponent-assign",
    title: "** 的右结合与 **=",
    src: "\nconsole.log(2 ** 3 ** 2, (-2) ** 2);\nlet a = 2;\na **= 3;\nconsole.log(a);\n",
  },
  {
    id: "c623-equality-table",
    title: "== 与 === 的类型转换表",
    src: "\nconsole.log(null == undefined, null === undefined, 0 == \"\", 0 == false, \"\" == false);\nconsole.log([] == false, [1] == 1, \"1\" == 1, NaN == NaN, Object.is(NaN, NaN));\n",
  },
  {
    id: "c623-to-primitive",
    title: "对象转原始值：valueOf / toString / Symbol.toPrimitive 的次序",
    src: "\nconst o: any = {\n  valueOf() { return 2; },\n  toString() { return \"s\"; },\n};\nconsole.log(o + 1, `${o}`, o * 2);\nconst p: any = { [Symbol.toPrimitive](h: string) { return h === \"number\" ? 5 : \"P\"; } };\nconsole.log(p + 1, `${p}`);\n",
  },
  {
    id: "c623-getter-on-prototype",
    title: "原型上的访问器被子类实例读到",
    src: "\nfunction Base(this: any) { this._n = 1; }\nObject.defineProperty(Base.prototype, \"n\", {\n  get() { return this._n; },\n  set(v: number) { this._n = v; },\n  configurable: true,\n});\nconst b: any = new (Base as any)();\nb.n = 4;\nconsole.log(b.n, Object.getOwnPropertyDescriptor(Base.prototype, \"n\").configurable);\n",
  },
  {
    id: "c623-string-iterator",
    title: "字符串的迭代器按码点切分",
    src: "\nconsole.log([...\"a😀b\"].length, \"a😀b\".length);\nconsole.log([...\"abc\"].join(\"-\"), Array.from(\"😀\").length);\n",
  },
  {
    id: "c623-array-iterator",
    title: "数组迭代器与解构、entries 的配合",
    src: "\nconst [a, b] = [1, 2, 3];\nconsole.log(a, b);\nconst it = [10, 20][Symbol.iterator]();\nconsole.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));\nconsole.log([... [1, 2].entries()].map((e) => e.join(\":\")).join(\",\"));\n",
  },
  {
    id: "c623-array-holes",
    title: "稀疏数组：length / join / map / forEach 的跳空",
    src: "\nconst a = [1, , 3];\nconsole.log(a.length, a.join(\",\"), a.map((x) => x).length, a.filter(() => true).length);\nlet seen = 0;\na.forEach(() => seen++);\nconsole.log(seen, JSON.stringify(a), Object.keys(a).join(\",\"));\n",
  },
  {
    id: "c623-array-sort",
    title: "Array.sort 的比较器与稳定性",
    src: "\nconsole.log([10, 9, 1].sort().join(\",\"));\nconsole.log([10, 9, 1].sort((x, y) => x - y).join(\",\"));\nconst rows = [{ k: 1, v: \"a\" }, { k: 0, v: \"b\" }, { k: 1, v: \"c\" }];\nconsole.log(rows.sort((x, y) => x.k - y.k).map((r) => r.v).join(\"\"));\nconsole.log([\"b\", \"a\"].sort().join(\",\"));\n",
  },

  // ===== 第 647 轮：普查量出来的新场景（候选 27 条 -> 收 26 条）=====
  //
  // **一条都不是凭空写的** ✓：它们是「先写候选、交给 `sweep` 量一遍」量出来的 ✓
  //（口径见 docs/typescript-parsing-gaps.md 的「怎么量缺口」✓）。其中
  // `thisArg` / `split` 的负数上限 / `isSupersetOf` / 孤立代理项 四条**当场红了** ✓
  //（全是**静默错值**那一类 ✓），修完之后连着其余 22 条一起收进来 ✓；
  // 落选的那一条是 `Promise.all(非可迭代物)`（本仓**抛**、JS 给**被拒绝的承诺** ✓），
  // 它记在 docs/runtime-architecture.md 的「已知差异」里，不进矩阵 ✓。
  {
    id: "c647-std-toreversed-tospliced-tosorted",
    title: "ES2023 非变体数组方法：toReversed / toSorted / toSpliced / with",
    src: "\nconst xs = [3, 1, 2];\nconsole.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.toSorted()), JSON.stringify(xs));\nconsole.log(JSON.stringify(xs.toSpliced(1, 1, 9, 8)), JSON.stringify(xs));\nconsole.log(JSON.stringify(xs.with(0, 7)), JSON.stringify(xs.with(-1, 5)));\nconsole.log(JSON.stringify(xs));\n",
  },
  {
    id: "c647-std-array-with-out-of-range",
    title: "Array.prototype.with 越界抛 RangeError",
    src: "\nconst xs = [1, 2, 3];\ntry { xs.with(3, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }\ntry { xs.with(-4, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }\nconsole.log(JSON.stringify(xs.with(1.0, 9)));\n",
  },
  {
    id: "c647-std-callback-thisarg",
    title: "回调的第二个实参 thisArg：map / filter / forEach / flatMap / 谓词族 / Array.from",
    src: "\nconst ctx = { k: 10, tag: \"ctx\" };\nconst xs = [1, 2, 3];\nconsole.log(JSON.stringify(xs.map(function (v) { return v + this.k; }, ctx)));\nconsole.log(JSON.stringify(xs.filter(function (v) { return v + this.k > 12; }, ctx)));\nlet seen = \"\";\nxs.forEach(function (v) { seen += this.tag + v; }, ctx);\nconsole.log(seen);\nconsole.log(JSON.stringify(xs.flatMap(function (v) { return [v, this.k]; }, ctx)));\nconsole.log(xs.some(function (v) { return v === this.k; }, ctx), xs.every(function (v) { return v < this.k; }, ctx));\nconsole.log(xs.find(function (v) { return v === this.k; }, ctx), xs.findIndex(function (v) { return v === this.tag; }, ctx));\nconsole.log(JSON.stringify(Array.from(xs, function (v) { return v * this.k; }, ctx)));\nconsole.log(JSON.stringify(xs.map((v) => v * 2)));\n",
  },
  {
    id: "c647-std-object-getownpropertysymbols",
    title: "Object.getOwnPropertySymbols 与可枚举性",
    src: "\nconst s = Symbol(\"k\");\nconst o = { a: 1, [s]: 2 };\nconsole.log(Object.getOwnPropertySymbols(o).length, Object.getOwnPropertySymbols(o)[0] === s);\nconsole.log(Object.keys(o).join(\",\"), JSON.stringify(o));\nconsole.log(Object.getOwnPropertySymbols({}).length);\n",
  },
  {
    id: "c647-std-object-extensibility",
    title: "Object.isExtensible / isFrozen / isSealed 交叉形态",
    src: "\nconst a = { x: 1 };\nconsole.log(Object.isExtensible(a), Object.isFrozen(a), Object.isSealed(a));\nObject.preventExtensions(a);\nconsole.log(Object.isExtensible(a), Object.isFrozen(a), Object.isSealed(a));\nconst b = Object.seal({ y: 1 });\nconsole.log(Object.isExtensible(b), Object.isFrozen(b), Object.isSealed(b));\nconst c = Object.freeze({ z: 1 });\nconsole.log(Object.isExtensible(c), Object.isFrozen(c), Object.isSealed(c));\n",
  },
  {
    id: "c647-std-set-es2025-operations",
    title: "ES2025 集合运算：union / intersection / difference / 三问（含 isSupersetOf）",
    src: "\nconst a = new Set([1, 2, 3]);\nconst b = new Set([3, 4]);\nconsole.log(JSON.stringify([...a.union(b)]), JSON.stringify([...a.intersection(b)]));\nconsole.log(JSON.stringify([...a.difference(b)]), JSON.stringify([...a.symmetricDifference(b)]));\nconsole.log(a.isSubsetOf(b), a.isSupersetOf(b), a.isDisjointFrom(b));\nconsole.log(new Set([1]).isSubsetOf(a), a.isSupersetOf(new Set([1, 2])));\nconsole.log(new Set().isSupersetOf(a), a.isSupersetOf(new Set()), new Set().isDisjointFrom(a));\nconsole.log(typeof a.isSupersetOf, typeof a.union, typeof a.isDisjointFrom);\n",
  },
  {
    id: "c647-std-json-stringify-space-clamp",
    title: "JSON.stringify 的 space 上限 10 与字符串 space",
    src: "\nconst o = { a: { b: [1, 2] } };\nconsole.log(JSON.stringify(o, null, 20).split(\"\\n\")[1].length);\nconsole.log(JSON.stringify(o, null, \"abcdefghijklmn\").split(\"\\n\")[1].length);\nconsole.log(JSON.stringify(o, null, 0));\n",
  },
  {
    id: "c647-std-json-parse-proto-key",
    title: "JSON.parse 的 __proto__ 键是普通自有属性",
    src: "\nconst o = JSON.parse('{\"__proto__\": {\"x\": 1}, \"a\": 2}');\nconsole.log(Object.keys(o).join(\",\"), JSON.stringify(o.a));\nconsole.log(Object.getPrototypeOf(o) === Object.prototype);\n",
  },
  {
    id: "c647-std-uri-lone-surrogate",
    title: "encodeURI / encodeURIComponent 遇到孤立代理项抛 URIError",
    src: "\nconsole.log(encodeURIComponent(\"a b&c=d\"));\ntry { encodeURIComponent(\"\\uD800\"); } catch (e) { console.log(e instanceof URIError, e.name); }\ntry { encodeURI(\"\\uDC00\"); } catch (e) { console.log(e instanceof URIError, e.name); }\nconsole.log(encodeURIComponent(\"\\uD83D\\uDE00\"));\ntry { decodeURIComponent(\"%E0%A4%A\"); } catch (e) { console.log(e instanceof URIError, e.name); }\nconsole.log(decodeURIComponent(\"%41%42\"));\n",
  },
  {
    id: "c647-std-structuredclone-cycle",
    title: "structuredClone 处理环与 Map / Set / Date",
    src: "\nconst node = { name: \"root\", child: null };\nnode.child = node;\nconst copy = structuredClone(node);\nconsole.log(copy !== node, copy.child === copy, copy.name);\nconst box = structuredClone({ m: new Map([[\"k\", 1]]), s: new Set([2]), d: new Date(0) });\nconsole.log(box.m.get(\"k\"), box.s.has(2), box.d.getTime());\n",
  },
  {
    id: "c647-std-array-sort-comparator-nan",
    title: "sort 的比较器返回 NaN 时按 0 处理",
    src: "\nconst xs = [3, 1, 2];\nconsole.log(JSON.stringify(xs.sort(() => NaN)));\nconsole.log(JSON.stringify([\"b\", \"a\", \"c\"].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))));\n",
  },
  {
    id: "c647-std-array-includes-nan-and-holes",
    title: "includes 的 SameValueZero 与稀疏槽",
    src: "\nconst xs = [1, , NaN, undefined];\nconsole.log(xs.length, xs.includes(NaN), xs.includes(undefined), xs.indexOf(NaN), xs.indexOf(undefined));\nconsole.log(xs.includes(1, 1), xs.includes(1, -4));\n",
  },
  {
    id: "c647-std-string-replaceall-empty-pattern",
    title: "replaceAll 空串模式与函数替换",
    src: "\nconsole.log(\"abc\".replaceAll(\"\", \"-\"));\nconsole.log(\"a-b-c\".replaceAll(\"-\", (m) => m + m));\nconsole.log(\"aaa\".replaceAll(\"aa\", \"b\"));\nconsole.log(\"abc\".replaceAll(\"z\", \"y\"));\n",
  },
  {
    id: "c647-std-map-foreach-mutation",
    title: "Map.forEach 期间增删键的可见性",
    src: "\nconst m = new Map([[\"a\", 1], [\"b\", 2]]);\nconst seen = [];\nm.forEach((v, k) => {\n  seen.push(k + \":\" + v);\n  if (k === \"a\") { m.delete(\"b\"); m.set(\"c\", 3); }\n});\nconsole.log(seen.join(\",\"), m.size);\n",
  },
  {
    id: "c647-std-symbol-keyfor-description",
    title: "Symbol.keyFor / description 与注册表",
    src: "\nconst g = Symbol.for(\"shared\");\nconsole.log(Symbol.keyFor(g), g.description, Symbol.for(\"shared\") === g);\nconsole.log(Symbol.keyFor(Symbol(\"local\")), Symbol(\"local\").description);\nconst s = Symbol();\nconsole.log(s.description, String(s));\n",
  },
  {
    id: "c647-std-number-parseint-radix-zero",
    title: "parseInt 的 radix 0 / undefined / 16 前缀",
    src: "\nconsole.log(parseInt(\"0x1f\", 0), parseInt(\"0x1f\", 16), parseInt(\"0x1f\"), parseInt(\"10\", 0));\nconsole.log(parseInt(\"\"), parseInt(\"  42  \"), parseInt(\"42abc\"), parseInt(\"-0\"));\nconsole.log(Number.parseInt === parseInt, Number.parseFloat === parseFloat);\n",
  },
  {
    id: "c647-std-date-setmonth-rollover-forms",
    title: "Date 月末溢出与 setDate(0)",
    src: "\nconst d = new Date(Date.UTC(2020, 0, 31));\nconst e = new Date(d.getTime());\ne.setUTCMonth(1);\nconsole.log(e.toISOString());\nconst f = new Date(Date.UTC(2020, 2, 1));\nf.setUTCDate(0);\nconsole.log(f.toISOString());\n",
  },
  {
    id: "c647-std-string-split-negative-limit",
    title: "split 的 limit：负数是「不限」、0 是一段都不收、超过段数照给",
    src: "\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", -1)));\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", 0)));\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", 2)));\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", 9)));\nconsole.log(JSON.stringify(\"abc\".split(\"\", -1)), JSON.stringify(\"abc\".split(\"\", 0)));\n",
  },
  {
    id: "c647-std-string-split-limit-zero",
    title: "split 的 limit 与省略分隔符",
    src: "\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", -1)));\nconsole.log(JSON.stringify(\"a,b,c\".split(\",\", 2)));\nconsole.log(JSON.stringify(\"abc\".split(undefined)));\nconsole.log(JSON.stringify(\"\".split(\"\")));\nconsole.log(JSON.stringify(\"a,b,\".split(\",\")));\n",
  },
  {
    id: "c647-std-array-from-mapper-thisarg",
    title: "Array.from 的 mapper 与第三个实参 thisArg",
    src: "\nconst ctx = { k: 10 };\nconst out = Array.from([1, 2], function (v) { return v + this.k; }, ctx);\nconsole.log(JSON.stringify(out));\nconsole.log(JSON.stringify(Array.from(\"abc\")), JSON.stringify(Array.from(new Set([1, 1, 2]))));\nconsole.log(JSON.stringify(Array.from({ length: 3 }, (_, i) => i * 2)));\n",
  },
  {
    id: "c647-std-promise-any-empty",
    title: "Promise.any 空表与全拒绝的顺序",
    src: "\nPromise.any([])\n  .then(() => console.log(\"resolved\"))\n  .catch((e) => console.log(e.name, e.errors.length, e instanceof AggregateError));\nPromise.any([Promise.reject(\"x\"), Promise.resolve(\"y\")]).then((v) => console.log(\"any\", v));\n",
  },
  {
    id: "c647-std-async-iterator-symbol",
    title: "async 生成器带 Symbol.asyncIterator 与 for await",
    src: "\nasync function* gen() { yield 1; yield 2; }\nconst it = gen();\nconsole.log(typeof it[Symbol.asyncIterator], it[Symbol.asyncIterator]() === it);\n(async () => {\n  let sum = 0;\n  for await (const v of gen()) sum += v;\n  console.log(\"sum\", sum);\n})();\n",
  },
  {
    id: "c647-std-error-instanceof-forms",
    title: "Error 家族与 instanceof 的判定面",
    src: "\nconst kinds = [new Error(\"e\"), new TypeError(\"t\"), new RangeError(\"r\"), { name: \"Error\" }, \"x\"];\nfor (const k of kinds) console.log(k instanceof Error);\nconsole.log(new TypeError(\"t\") instanceof Error, new Error(\"e\") instanceof TypeError);\n",
  },
  {
    id: "c647-std-object-entries-roundtrip-symbols",
    title: "Object.entries / values 忽略 symbol 键与不可枚举",
    src: "\nconst o = { a: 1, b: 2 };\nObject.defineProperty(o, \"hidden\", { value: 3, enumerable: false });\no[Symbol(\"s\")] = 4;\nconsole.log(JSON.stringify(Object.entries(o)), JSON.stringify(Object.values(o)));\nconsole.log(Object.getOwnPropertyNames(o).join(\",\"));\n",
  },
  {
    id: "c647-std-math-fround-and-clz",
    title: "Math.fround / Math.imul / Math.clz32 边界",
    src: "\nconsole.log(Math.fround(0.1), Math.fround(1e300), Math.fround(-0));\nconsole.log(Math.imul(0x7fffffff, 2), Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));\nconsole.log(Math.hypot(), Math.hypot(3, 4), Math.sign(-0), Object.is(Math.sign(-0), -0));\n",
  },
  {
    id: "c647-std-string-localecompare-ascii",
    title: "localeCompare 的 ASCII 符号与排序用法",
    src: "\nconsole.log(\"a\".localeCompare(\"b\") < 0, \"b\".localeCompare(\"a\") > 0, \"a\".localeCompare(\"a\"));\nconsole.log(\"abc\".localeCompare(\"abd\") < 0, \"ab\".localeCompare(\"abc\") < 0);\nconsole.log([\"b\", \"a\", \"c\"].sort((x, y) => x.localeCompare(y)).join(\",\"));\n",
  },

];
