// xl:title `parseInt` / `parseFloat` 的边角
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => parseInt("12px") + "|" + parseInt("0x10") + "|" + parseInt("0x10", 16)));
console.log(t(() => parseInt("") + "|" + parseInt("08") + "|" + parseInt("-0")));
console.log(t(() => parseFloat("1.5x") + "|" + parseFloat(".5") + "|" + parseFloat("1e3")));
