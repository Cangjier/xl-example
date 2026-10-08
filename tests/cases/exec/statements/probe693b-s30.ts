// xl:title (function () { for (let i = 0; i < 1; i++) { function g() { return 1; } } return typeof g; })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why **块里的函数声明**（`{ function g() {} }`）在松散模式下按 Annex B **提升到函数作用域**（JS 里块外 `typeof g` 给 `"function"`），本仓只在块内可见 ⇒ 给 `"undefined"`（**静默错值**）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { for (let i = 0; i < 1; i++) { function g() { return 1; } } return typeof g; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
