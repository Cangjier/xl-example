// xl:title (function () { let n = 0; try { n = 1; throw 1; } catch (e) { n = 2; } finally { n = 3; } return n; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; try { n = 1; throw 1; } catch (e) { n = 2; } finally { n = 3; } return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
