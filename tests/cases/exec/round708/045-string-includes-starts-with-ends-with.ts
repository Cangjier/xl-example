// xl:title includes / startsWith / endsWith 的位次
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("abc".includes("b", 2)) + "," + show("abc".startsWith("b", 1)) + "," + show("abc".endsWith("b", 2)));
