// xl:title 条件里的赋值与比较链
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = 1, b = "1";
console.log(show(a == b) + "," + show(a === b) + "," + show(a < 2 < 1));
