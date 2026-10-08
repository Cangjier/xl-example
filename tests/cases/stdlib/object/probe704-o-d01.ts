// xl:title Object.keys(JSON.parse('{"2":1,"1":2,"a":3}')).join(",")
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.keys(JSON.parse('{"2":1,"1":2,"a":3}')).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
