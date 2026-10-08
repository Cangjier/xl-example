// xl:title (function () { const o = JSON.parse('{"__proto__":{"x":1},"a":2}'); return [o.a, Object.getOwnPropertyNames(o).join(",")].join("|"); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = JSON.parse('{"__proto__":{"x":1},"a":2}'); return [o.a, Object.getOwnPropertyNames(o).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
