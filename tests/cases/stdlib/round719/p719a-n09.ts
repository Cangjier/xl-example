// xl:title 大数 / 小数的默认渲染（与宿主那一档对齐）
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1e-7).toString() + "|" + (1e21).toString() + "|" + (1e-6).toString()));
console.log(t(() => (123456789012345680000).toString() + "|" + (5e-324).toString()));
console.log(t(() => (Number.MAX_SAFE_INTEGER).toString() + "|" + (Number.MAX_VALUE).toString()));
