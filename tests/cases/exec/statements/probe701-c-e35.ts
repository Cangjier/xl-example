// xl:title (function () { let s = ''; try { s += 'a'; } catch (e) { s += 'b'; } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; try { s += 'a'; } catch (e) { s += 'b'; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
