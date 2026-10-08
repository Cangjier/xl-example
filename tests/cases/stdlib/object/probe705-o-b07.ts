// xl:title Object.getOwnPropertyDescriptor(Math, "PI").writable
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor(Math, "PI").writable));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
