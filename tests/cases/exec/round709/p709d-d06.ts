// xl:title 严格函数的自有名字表
// xl:round 709
// xl:judge stdout
// xl:want differ
// xl:why 同 `p709a-a19`：脚本顶层的 `"use strict"` 没认，函数不是严格代码 ⇒ 自有名字表里多出 `arguments` / `caller`。要做。
// xl:end
"use strict";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyNames(function f(a: any) {}).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
