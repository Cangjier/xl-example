// xl:title defineProperty 普通对象的数字键与下标无关
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, 0, { value: 5, configurable: true, enumerable: true });
console.log(show(o[0]) + "," + show(Object.keys(o).join("|")) + "," + show(o.length));
