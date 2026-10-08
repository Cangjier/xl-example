// xl:title Object.is(Object.freeze({a:1}), Object.freeze({a:1}))
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.is(Object.freeze({a:1}), Object.freeze({a:1}))));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
