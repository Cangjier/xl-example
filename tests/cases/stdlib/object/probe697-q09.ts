// xl:title typeof Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").get
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").get));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
