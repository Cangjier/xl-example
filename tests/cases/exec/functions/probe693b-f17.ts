// xl:title (function () { const f = function () { "use strict"; return this === undefined; }; return f(); })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why 函数体开头的 **`"use strict"` 指令**本仓不认 ⇒ `function () { "use strict"; return this === undefined; }` 给假（JS 给真）。这一条影响的是**整个严格模式那一族**（`arguments` 的映射、`delete`、八进制字面量……），口径要先定下来再做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = function () { "use strict"; return this === undefined; }; return f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
