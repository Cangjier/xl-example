// xl:title Object.getOwnPropertyDescriptor({ ["__proto__"]: 1 }, "__proto__").value
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor({ ["__proto__"]: 1 }, "__proto__").value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
