// xl:title 两个别名的行为与 `trimStart` / `trimEnd` 一致
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "  a  ".trimLeft() + "|" + "  a  ".trimRight()));
console.log(t(() => "\n\tab".trimLeft().length + "|" + "ab\n\t".trimRight().length));
console.log(t(() => "".trimLeft() + "|" + "   ".trimRight().length));
