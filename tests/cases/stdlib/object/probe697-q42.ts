// xl:title Object.keys(JSON.parse('{"__proto__":{"x":1}}')).join(",")
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.keys(JSON.parse('{"__proto__":{"x":1}}')).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
