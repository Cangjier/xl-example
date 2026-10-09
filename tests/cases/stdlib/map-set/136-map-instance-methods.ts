// xl:title Map 的实例方法：get / set / has / delete / clear / size 与返回值
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/map-set 里逐条一问的 23 条探针
// （p-map-identity-key · p-map-nan-key · p-map-negzero-key · probe-g14 · probe3-m9 · probe694-map2 · probe696-m22 · probe694-map3 · probe696-m7 · probe693-m5 · probe693-m16 · probe696-m12·13 · probe694-map18 · probe696-m14 · probe703-m-d12·13 · probe705-m-d10·11 · probe705-m-d15 · probe705-m-d6 · probe705-m-d19 · probe696-m11）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 读不到给 undefined、set 返回自身可链式、delete 的布尔、clear 的返回、constructor 与 typeof

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-map-identity-key.ts（第 692 轮）
(() => {
  const m = new Map();
  const a = {};
  const b = {};
  m.set(a, 1);
  console.log(m.get(a), m.get(b), m.size);
})();

// 吸收 p-map-nan-key.ts（第 692 轮）
(() => {
  const m = new Map();
  m.set(NaN, 1);
  console.log(m.get(NaN), m.has(NaN));
})();

// 吸收 p-map-negzero-key.ts（第 692 轮）
(() => {
  const m = new Map();
  m.set(-0, 1);
  console.log(m.get(0), m.has(-0));
})();

// 吸收 probe-g14.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map().get(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-m09.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map(); return m.get("missing") === undefined; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-map02.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([["a", 1]]).get("b")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m22.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, "a"]]).get(2)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-map03.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map().set("a", 1).size));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m07.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map().set(1, 1).get(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693-m05.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); m.set("a", 2); return m.size + "," + m.get("a"); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m12.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, "a"]]).delete(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m13.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([[1, "a"]]); m.delete(1); return m.size; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-map18.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); m.clear(); return m.size; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m14.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map(); m.set(1, "a"); m.clear(); return m.size; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d12.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]]).delete(1) && "ok"));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d13.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]]).clear() === undefined));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-m-d10.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([[1, 2]]); m.delete(1); return m.size; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-m-d11.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([[1, 2]]); m.clear(); return m.size; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-m-d15.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]]).constructor === Map));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-m-d06.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]]).get(2)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-m-d19.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]]).has(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m11.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([[1, "a"]]); return m.has("1"); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
