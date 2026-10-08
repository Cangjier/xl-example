// xl:title (function () { let s = ''; for (const [k, v] of new Map([[1, 'a']])) s += k + v; return s; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; for (const [k, v] of new Map([[1, 'a']])) s += k + v; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
