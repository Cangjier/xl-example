// xl:title (function () { const o = JSON.parse('{"__proto__":{"x":1}}', (k, v) => v); return Object.getPrototypeOf(o) === Object.prototype; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = JSON.parse('{"__proto__":{"x":1}}', (k, v) => v); return Object.getPrototypeOf(o) === Object.prototype; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
