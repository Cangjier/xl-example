// xl:title 展开到数组字面量
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const xs = [1, 2];
console.log(show(JSON.stringify([...xs])) + "," + show(JSON.stringify({ ...xs })));
