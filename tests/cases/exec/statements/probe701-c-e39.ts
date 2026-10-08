// xl:title (function () { let s = ''; try { for (const x of [1, 2]) { s += x; if (x === 1) continue; } } finally { s += 'f'; } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; try { for (const x of [1, 2]) { s += x; if (x === 1) continue; } } finally { s += 'f'; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
