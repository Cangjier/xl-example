// xl:title `Number(...)` 的转换表
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Number("1e3") + "|" + Number("Infinity") + "|" + Number("  0x10  ")));
console.log(t(() => Number("") + "|" + Number(" ") + "|" + Number(null as any) + "|" + Number(undefined as any)));
console.log(t(() => Number(true) + "|" + Number("12px") + "|" + Number("1_0")));
