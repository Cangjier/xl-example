// xl:title JSON.parse(JSON.stringify({ a: [1, { b: 2 }] })).a[1].b
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.parse(JSON.stringify({ a: [1, { b: 2 }] })).a[1].b));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
