// xl:title `trimLeft` / `trimRight` 与 `trimStart` / `trimEnd` 是同一格
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (String.prototype as any).trimLeft === (String.prototype as any).trimStart));
console.log(t(() => (String.prototype as any).trimRight === (String.prototype as any).trimEnd));
