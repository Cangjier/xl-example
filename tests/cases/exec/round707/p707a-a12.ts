// xl:title includes 与 NaN 的洞
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show([1, 2, 3].includes(2)) + "," + show([NaN].includes(NaN)) + "," + show([NaN].indexOf(NaN)));
