// xl:title toReversed / toSorted / toSpliced / with 不改原件
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [3, 1, 2];
console.log(show(JSON.stringify(a.toReversed())) + "," + show(JSON.stringify(a.toSorted())) + "," + show(JSON.stringify(a.with(0, 9))) + "," + show(JSON.stringify(a)));
