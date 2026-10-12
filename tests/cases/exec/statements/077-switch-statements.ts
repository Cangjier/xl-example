// xl:title switch：穿透 / default 的位置 / 严格相等 / 标签 break
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 12 条探针
// （p-switch-default-middle · probe2-c7 · probe693b-s12·13 · probe693b-s15 · probe693b-s26 · probe698-e7 · probe701-c-e1…3 · probe701-c-e30 · probe701-c-e36）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// case 的穿透与 break、default 夹在中间、'1' 与 1 不等、带标签的 break sw

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-switch-default-middle.ts（第 692 轮）
(() => {
  function f(x) {
    switch (x) {
      case 1:
        return "one";
      default:
        return "other";
      case 2:
        return "two";
    }
  }
  console.log(f(1), f(2), f(3));
})();

// 吸收 probe2-c07.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch (2) { case 1: return "one"; default: return "other"; case 2: return "two"; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s12.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; for (let i = 0; i < 3; i++) { switch (i) { case 0: s += "a"; case 1: s += "b"; break; default: s += "c"; } } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s13.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch (2) { default: return "d"; case 2: return "two"; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s15.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; switch ("1") { case 1: s += "num"; break; default: s += "other"; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s26.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: switch (1) { case 1: s += "a"; break lbl; } s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-e07.ts（第 698 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let n = 0; sw: switch (1) { case 1: n = 1; break sw; default: n = 9; } return n; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e01.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch (1) { case 1: return 'a'; default: return 'b'; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e02.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch (2) { case 1: case 2: return 'a'; default: return 'b'; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e03.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ''; switch (1) { case 1: s += 'a'; case 2: s += 'b'; break; case 3: s += 'c'; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e30.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch ('a') { case 'a': return 1; case 'b': return 2; } return 0; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e36.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { switch (1) { default: return 'd'; case 1: return 'one'; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
