// xl:title Reflect 这个全局名在：Reflect === undefined 该是假
// xl:round 705
// xl:judge stdout
// xl:want pass
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Reflect === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
