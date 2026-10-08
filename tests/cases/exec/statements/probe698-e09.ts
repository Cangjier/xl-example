// xl:title (function () { try { throw 1; } catch (e) { try { throw 2; } catch (e2) { return e + "," + e2; } } })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw 1; } catch (e) { try { throw 2; } catch (e2) { return e + "," + e2; } } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
