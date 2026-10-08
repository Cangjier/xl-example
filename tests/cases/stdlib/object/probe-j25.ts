// xl:title Object.defineProperty({}, "a", { value: 1, enumerable: false }).propertyIsEnumerable("a")
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.defineProperty({}, "a", { value: 1, enumerable: false }).propertyIsEnumerable("a")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
