// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show((() => { "use strict"; return this === undefined ? "u" : typeof this; })()));
// xl:round 701
// xl:judge stdout
// xl:want differ
// xl:why **模块顶层的 `this` 是 `undefined`**：裁判按 CJS 跑，那里 `this` 是 `module.exports`（一个对象）——所以 `(() => typeof this)()` 在 Node 里给 `"object"`、本仓给 `"undefined"`（本仓按 ESM 的口径给）。**箭头那一档本次已经对齐**（`function outer() { const f = () => { "use strict"; return typeof this; }; return f(); }` 两边都是 `"object"`），差的是**模块那一帧自己的 `this`**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show((() => { "use strict"; return this === undefined ? "u" : typeof this; })()));
