// xl:title (function () { let s = ''; try { throw new Error('x'); } catch (e) { s += 'catch'; } finally { s += '-fin'; } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; try { throw new Error('x'); } catch (e) { s += 'catch'; } finally { s += '-fin'; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
