// xl:title `Object.setPrototypeOf` 的原型是数字 / 字符串 / 布尔 / 符号
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.setPrototypeOf({}, 1 as any)));
console.log(t(() => Object.setPrototypeOf({}, "x" as any)));
console.log(t(() => Object.setPrototypeOf({}, true as any)));
console.log(t(() => Object.setPrototypeOf({}, Symbol("s") as any)));
