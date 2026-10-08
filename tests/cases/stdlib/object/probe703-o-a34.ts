// xl:title Object.defineProperty([1, 2], "length", { value: 1 }) && "ok"
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.defineProperty([1, 2], "length", { value: 1 }) && "ok"));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
