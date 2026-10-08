// xl:title 属性值走 ToString：数值 / 对象 / 布尔 / null
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1).anchor("n")));
console.log(t(() => "a".fontsize({ toString() { return 7; } })));
console.log(t(() => "a".fontcolor(true)));
console.log(t(() => "a".anchor(null)));
