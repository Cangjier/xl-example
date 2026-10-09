// xl:title 模板串的插值形状
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = 1;
console.log(`x${a}y${a + 1}z`);
console.log(show(`${null}${undefined}${[1, 2]}`));
