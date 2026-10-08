// xl:title (function () { const m = new Map([["a", 1], ["b", 2]]); const out = []; m.forEach((v, k, self) => out.push(self === m)); return out.join(","); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1], ["b", 2]]); const out = []; m.forEach((v, k, self) => out.push(self === m)); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
