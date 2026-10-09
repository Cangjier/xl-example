// xl:title 函数对象的自有名字表与自有格（各函数形态）
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 exec/round709 里逐条一问的 17 条探针
// （`p709a-a01`…`a08` · `a12`…`a15` · `a17` · `a20` · `p709d-d04` · `d07` · `d08`）。
// 正文逐句搬进 `probe(f)` 小壳，打印口径与探针一字不差。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => Object.getOwnPropertyNames(function f(a, b) {}).join(","));
probe(() => Object.getOwnPropertyNames((a: any, b: any) => {}).join(","));
probe(() => Object.getOwnPropertyNames({ m(a: any, b: any) {} }.m).join(","));
probe(() => Object.getOwnPropertyNames(class C { m(a: any, b: any) {} }.prototype.m).join(","));
probe(() => Object.getOwnPropertyNames(function* g(a: any) {}).join(","));
probe(() => Object.getOwnPropertyNames(async function a(b: any) {}).join(","));
probe(() => { const d: any = Object.getOwnPropertyDescriptor({ get x() { return 1; } }, "x"); return Object.getOwnPropertyNames(d.get).join(","); });
probe(() => Object.getOwnPropertyNames(class C {}).join(","));
probe(() => (function f() {}).hasOwnProperty("arguments") + "," + (function f() {}).hasOwnProperty("caller"));
probe(() => (() => {}).hasOwnProperty("arguments") + "," + (() => {}).hasOwnProperty("caller"));
probe(() => ({ m() {} }).m.hasOwnProperty("arguments"));
probe(() => (function () { "use strict"; }).hasOwnProperty("arguments"));
probe(() => Object.keys(function f() {}).length);
probe(() => Object.getOwnPropertyNames(function named(a: any) {}).join(","));
probe(() => { let out = ""; for (const k in function f() {}) { out = out + k + ","; } return out; });
probe(() => (function f() {}).hasOwnProperty("prototype"));
probe(() => (() => {}).hasOwnProperty("prototype"));
