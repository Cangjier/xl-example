// xl:title yield* 委托
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function* inner() { yield 1; yield 2; }
function* outer() { yield 0; yield* inner(); yield 3; }
console.log(show([...outer()].join("|")));
