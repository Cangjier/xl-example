// xl:title defineProperty 用数字键变量
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const n = 1; const o = {}; Object.defineProperty(o, n, { value: "v", enumerable: true });
console.log(show(o["1"]));
