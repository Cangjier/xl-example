// xl:title Array.from(new Map([['a', 1]]), e => e[0] + e[1]).join()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.from(new Map([['a', 1]]), e => e[0] + e[1]).join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
