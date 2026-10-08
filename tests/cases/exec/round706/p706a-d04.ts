// xl:title Date.now 与 valueOf 同一条线
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const t = Date.now();
console.log(show(typeof t) + "," + show(new Date(t).getTime() === t));
