// xl:title Object.getPrototypeOf(Object.setPrototypeOf({}, null))
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getPrototypeOf(Object.setPrototypeOf({}, null))));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
