// xl:title 字符串方法的实参强制转换：ToString / ToIntegerOrInfinity 与缺省实参
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 61 条探针
// （probe694-y7 · probe699-s-e35 · probe700-g-e01…45 · probe699-s-t07…10 · probe696-s3 · probe699-s-e39 · probe703-s-e29 · probe700-g-t03…5 · probe705-s-g2 · probe705-s-g10 · probe694-y5·6）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 对象实参走 ToString（toString null 就退 valueOf）、下标走 ToIntegerOrInfinity、缺省实参那几档

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe694-y07.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes("")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe699-s-e35.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes("A")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e01.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes({ toString: () => "b" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e02.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e03.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf({ toString: () => "c" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e04.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".startsWith({ toString: () => "a" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e05.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".endsWith({ toString: () => "c" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e06.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".lastIndexOf({ toString: () => "b" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e07.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes({ toString: () => "b" }, { valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e08.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf("b", { valueOf: () => 2 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e09.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".lastIndexOf("b", { valueOf: () => 0 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e10.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".charAt({ valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e11.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".charCodeAt({ valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e12.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".codePointAt({ valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e13.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".at({ valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e14.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".at("1")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e15.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".slice({ valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e16.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".substring({ valueOf: () => 2 }, { valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e17.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".substr({ valueOf: () => 1 }, { valueOf: () => 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e18.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("ab".repeat({ valueOf: () => 2 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e19.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("ab".padStart({ valueOf: () => 4 }, { toString: () => "0" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e20.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("ab".padEnd(4, { toString: () => "0" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e21.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".replace({ toString: () => "b" }, "X")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e22.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".replace("b", { toString: () => "X" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e23.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a,b".split({ toString: () => "," }).join("|")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e24.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".concat(1, true, null, undefined)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e25.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".concat([1, 2])));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e26.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".concat({ toString: () => "T" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e27.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(String.prototype.includes.call(new String("abc"), "b")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e28.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e29.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e30.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".startsWith()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e31.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".endsWith()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e32.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes(undefined)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e33.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".split(undefined).length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e34.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".replace(undefined, "X")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e35.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".localeCompare({ toString: () => "abc" })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e36.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("".padStart(3, "ab")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e37.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".padStart(2, "0")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e38.ts（第 702 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a".repeat({ valueOf: () => 1.9 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e39.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".slice(true)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e40.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".repeat(true)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e41.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".includes(true)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e42.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf(null)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e43.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".startsWith(null, null)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e44.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".endsWith("c", { valueOf: () => 3 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-e45.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("x".repeat(2.9)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe699-s-t07.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show([..."ab"].join(",")) + "|" + show(Array.from("ab").join(",")));
})();

// 吸收 probe699-s-t08.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const o = { toString() { return "k"; } };
  console.log(show("abc".includes(o)) + "|" + show("abc".indexOf(o)));
})();

// 吸收 probe699-s-t09.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show("abc".includes("b", undefined)) + "|" + show("abc".startsWith("b", undefined)));
})();

// 吸收 probe699-s-t10.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show("abc".slice(undefined, undefined)) + "|" + show("abc".substring(undefined, 2)));
})();

// 吸收 probe696-s03.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a-b-c".split("-", 2).join("|")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe699-s-e39.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a-b-c".split("-", 2).join("+")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e29.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a,b".split(",").join("|")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-g-t03.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const boxed = new String("ab");
  console.log(show(boxed.includes("a")) + "|" + show(boxed + "c") + "|" + show(String.prototype.at.call(boxed, 1)));
})();

// 吸收 probe700-g-t04.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const sym = Symbol("k");
  const o = { [sym]: "S" };
  console.log(show(String(o)) + "|" + show(o[sym]));
})();

// 吸收 probe700-g-t05.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const o = { toString: null, valueOf: () => 7 };
  console.log(show("abc".includes(o)) + "|" + show(String(o)));
})();

// 吸收 probe705-s-g02.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("".length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-s-g10.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("  ".trim()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-y05.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".indexOf("")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-y06.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".lastIndexOf("")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
