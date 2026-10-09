// xl:title `class E extends Error` 的宿主继承仍然合法、`instanceof` 成立
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

class E extends Error {}
console.log(t(() => (new E() instanceof Error) + "|" + (E as any).name));
