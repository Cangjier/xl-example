// xl:title Object.assign 只抄可枚举自有
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = {}; Object.defineProperty(s, "h", { value: 1, enumerable: false }); s.v = 2;
console.log(show(JSON.stringify(Object.assign({}, s))));
