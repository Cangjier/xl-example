// xl:title `Number.is*` 那一族不做转换
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Number.isInteger(1) + "|" + Number.isInteger(1.5) + "|" + Number.isInteger("1" as any)));
console.log(t(() => Number.isSafeInteger(2 ** 53) + "|" + Number.isFinite("1" as any) + "|" + Number.isNaN("a" as any)));
