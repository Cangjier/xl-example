// xl:title (function () { const m = new Map([["a", 1]]); const it = m[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1]]); const it = m[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
