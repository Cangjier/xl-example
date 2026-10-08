// xl:title (function () { let s = ""; try { s += "a"; throw 1; } catch (e) { s += "b"; } finally { s += "c"; } return s; })()
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; try { s += "a"; throw 1; } catch (e) { s += "b"; } finally { s += "c"; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
