// xl:title Object.getPrototypeOf({ ["__proto__"]: { z: 1 } }) === Object.prototype
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getPrototypeOf({ ["__proto__"]: { z: 1 } }) === Object.prototype));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
