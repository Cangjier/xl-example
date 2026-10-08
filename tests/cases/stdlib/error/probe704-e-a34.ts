// xl:title Object.getPrototypeOf(new TypeError("m")) === TypeError.prototype
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getPrototypeOf(new TypeError("m")) === TypeError.prototype));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
