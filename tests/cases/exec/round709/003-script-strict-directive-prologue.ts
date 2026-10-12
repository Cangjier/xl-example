// xl:title 函数声明在脚本顶层的严格指令序言之下
// xl:round 795
// xl:judge stdout
// xl:want differ
// xl:why **脚本顶层的 `"use strict"` 指令序言没认**：第 701 轮只把**函数体开头**那一串认成指令序言，脚本 / 模块那一层没有 ⇒ 整份文件里的函数都按松散代码记（`HasRestricted`），于是 `Object.getOwnPropertyNames` 里多出 `arguments` / `caller` 两格（Node 给 `["length","name","prototype"]`）。与 `p709d-d06` **同一条根**。要做。
// xl:end
// 原 `exec/round709/001-function-at-strict-blockin`，第 795 轮按命名规范改名（正文与台账一字未动）。
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/round709/p709a-a19.ts
//   · exec/round709/p709d-d06.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
"use strict";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyNames(function f(a: any) {}).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
