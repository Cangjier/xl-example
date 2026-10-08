// xl:title Map.groupBy
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const r = Map.groupBy([1, 2, 3], (x) => (x % 2 === 0 ? "e" : "o"));
console.log(show(r instanceof Map) + "," + show(JSON.stringify([...r]) ));
