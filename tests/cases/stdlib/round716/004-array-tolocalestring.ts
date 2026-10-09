// xl:title Array.prototype.toLocaleString：逐项与嵌套数组的渲染
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

console.log(show([1, 2].toLocaleString()) + "|" + show([1, [2, 3]].toLocaleString()));
})();
