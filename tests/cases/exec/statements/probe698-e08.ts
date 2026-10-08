// xl:title (function () { let out = ""; try { throw new Error("x"); } catch { out = "caught"; } return out; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; try { throw new Error("x"); } catch { out = "caught"; } return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
