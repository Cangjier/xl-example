// xl:title (function () { const o = Object.create({}, { a: { value: 1, enumerable: true } }); return [o.a, Object.keys(o).length, Object.getOwnPropertyNames(o).join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.create({}, { a: { value: 1, enumerable: true } }); return [o.a, Object.keys(o).length, Object.getOwnPropertyNames(o).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
