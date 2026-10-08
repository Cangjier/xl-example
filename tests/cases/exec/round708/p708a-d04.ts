// xl:title 解构默认值只在 undefined 上生效
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const { a = 1, b = 2 } = { a: null, b: 0 };
console.log(show(a) + "," + show(b));
