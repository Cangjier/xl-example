// xl:title Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a').enumerable
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a').enumerable));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
