// xl:title toFixed / toPrecision / toExponential 的缺省
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show((1.005).toFixed(2)) + "," + show((123.456).toPrecision(4)) + "," + show((123.456).toExponential(2)));
