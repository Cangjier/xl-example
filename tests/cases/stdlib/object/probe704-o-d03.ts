// xl:title Object.getOwnPropertyDescriptor(Object.freeze({a:1}), "a").writable
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor(Object.freeze({a:1}), "a").writable));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
