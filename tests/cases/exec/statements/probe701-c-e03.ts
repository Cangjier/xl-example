// xl:title (function () { let s = ''; switch (1) { case 1: s += 'a'; case 2: s += 'b'; break; case 3: s += 'c'; } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; switch (1) { case 1: s += 'a'; case 2: s += 'b'; break; case 3: s += 'c'; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
