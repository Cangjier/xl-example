// xl:title Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").enumerable
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").enumerable));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
