// xl:title Object.getOwnPropertyDescriptor({ get a() { return 1; } }, "a").get !== undefined
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor({ get a() { return 1; } }, "a").get !== undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
