// xl:title hasOwnProperty 在原始值上
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("ab".hasOwnProperty("length")) + "," + show("ab".hasOwnProperty(0)) + "," + show("ab".hasOwnProperty("1")));
