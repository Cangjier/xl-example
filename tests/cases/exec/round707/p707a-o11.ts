// xl:title Object.create 带属性表
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = Object.create({ inherited: 1 }, { own: { value: 2, enumerable: true } });
console.log(show(o.inherited) + "," + show(Object.keys(o).join("|")));
