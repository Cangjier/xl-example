// xl:title parse 带空白与数字形状
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(JSON.stringify(JSON.parse("  [1, 2.5, -0]  "))) + "," + show(JSON.stringify(JSON.parse('"a"'))) + "," + show(String(JSON.parse("1e2"))));
