// xl:title ({ valueOf() { return 2; }, toString() { return "t"; } }) + 1
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(({ valueOf() { return 2; }, toString() { return "t"; } }) + 1));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
