// xl:title 属性值只转义 `"`、`&` / `<` / `>` 原样
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".link("x\"y")));
console.log(t(() => "a".anchor("a&b<c>d")));
console.log(t(() => "a".fontcolor("\"\"\"")));
