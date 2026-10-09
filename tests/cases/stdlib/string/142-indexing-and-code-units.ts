// xl:title 下标与码元：越界 / fromCodePoint / 代理对 / Symbol.iterator
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 13 条探针
// （p-str-astral · p-str-at-negative · p-str-charcodeat-nan · p-str-indexof-from · probe693-y34 · probe695-y11 · probe695-y15 · probe695-y17 · probe699-s-e38 · probe703-s-e18 · probe704-s-e7 · probe704-s-e26 · probe704-s-e28）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 码位与码元、越界给 undefined / NaN、normalize 的四种形式、Symbol.iterator 那一格

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-str-astral.ts（第 692 轮）
(() => {
  const e = String.fromCodePoint(0x1f600);
  console.log(e.length, e.codePointAt(0), Array.from(e).length);
})();

// 吸收 p-str-at-negative.ts（第 692 轮）
(() => {
  console.log("abc".at(-1), "abc".at(5), "abc"[5]);
})();

// 吸收 p-str-charcodeat-nan.ts（第 692 轮）
(() => {
  console.log("ab".charCodeAt(5), "ab".codePointAt(5), "ab".charCodeAt(0));
})();

// 吸收 p-str-indexof-from.ts（第 692 轮）
(() => {
  console.log("abcabc".indexOf("b", 2), "abcabc".indexOf("b", -2), "abc".indexOf(""));
})();

// 吸收 probe693-y34.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("\u00e9".normalize("NFD").length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-y11.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".split("").reverse().join("")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-y15.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".at(-4)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-y17.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("A".charCodeAt(0) < "a".charCodeAt(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe699-s-e38.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".toUpperCase().slice(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e18.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("x".codePointAt(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-s-e07.ts（第 704 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc"[5]));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-s-e26.ts（第 704 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("\u{1F600}".length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-s-e28.ts（第 704 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof "abc"[Symbol.iterator]));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
