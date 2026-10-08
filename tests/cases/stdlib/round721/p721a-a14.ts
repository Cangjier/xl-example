// xl:title delete 下标：留洞、length 不动、JSON 给 null
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
console.log(show(delete a[1]) + "," + show(a.length) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join(",")) + "," + show(a.hasOwnProperty("1")));
