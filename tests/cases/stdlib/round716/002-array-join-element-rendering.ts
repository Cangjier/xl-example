// xl:title join 的逐项渲染：嵌套数组、null / undefined、空洞
// xl:round 716
// xl:judge stdout
// xl:want pass
// xl:end
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(show([1, [2, 3]].toString()) + "|" + show([null, undefined, 1].toString()) + "|" + show([, 1].toString()));
})();
