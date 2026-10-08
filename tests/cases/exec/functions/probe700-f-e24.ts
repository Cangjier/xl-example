// xl:title (function () { 'use strict'; return this === undefined ? 'u' : typeof this; })()
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 函数体开头的 `"use strict"` 没认：整份文件是松散模式时，`(function () { 'use strict'; return this === undefined })()` 该给真，本仓给假（`this` 还是全局对象）。与台账里 `exec/functions/probe693b-f17` **同一条根**——指令序言那一档要按**函数体自己的**第一条语句判。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { 'use strict'; return this === undefined ? 'u' : typeof this; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
