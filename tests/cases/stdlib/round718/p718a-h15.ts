// xl:title `anchor` / `link` 的标签都是 `a`，属性不同
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "s".anchor("n").slice(0, 9)));
console.log(t(() => "s".link("u").slice(0, 9)));
console.log(t(() => "s".fontcolor("c").slice(0, 11) + "|" + "s".fontsize(3).slice(0, 10)));
