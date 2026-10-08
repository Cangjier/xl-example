// xl:title Reflect 与 Object 两边的口径差（getPrototypeOf / isExtensible）
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(show(Object.getPrototypeOf(1) === Number.prototype) + "|" + show(Object.isExtensible(1)) + "|" + t(() => Reflect.isExtensible(1 as any)));
