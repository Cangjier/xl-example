// xl:title 函数声明在严格模块里
// xl:round 709
// xl:judge stdout
// xl:want differ
// xl:why **脚本顶层的 `"use strict"` 指令序言没认**：第 701 轮只把**函数体开头**那一串认成指令序言，脚本 / 模块那一层没有 ⇒ 整份文件里的函数都按松散代码记（`HasRestricted`），于是 `Object.getOwnPropertyNames` 里多出 `arguments` / `caller` 两格（Node 给 `["length","name","prototype"]`）。与 `p709d-d06` **同一条根**。要做。
// xl:end
"use strict";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyNames(function f(a: any) {}).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
