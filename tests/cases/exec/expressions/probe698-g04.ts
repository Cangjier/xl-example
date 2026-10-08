// xl:title (function () { const o = { a: 1 }; const p = Object.create(o); return ["a" in p, p.hasOwnProperty("a")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; const p = Object.create(o); return ["a" in p, p.hasOwnProperty("a")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
