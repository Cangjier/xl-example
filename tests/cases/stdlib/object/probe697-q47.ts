// xl:title JSON.stringify(JSON.parse('{"__proto__":{"x":1}}'))
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify(JSON.parse('{"__proto__":{"x":1}}'))));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
