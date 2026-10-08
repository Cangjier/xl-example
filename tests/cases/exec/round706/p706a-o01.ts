// xl:title Object.freeze 后赋值不抛、值不变
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: 1 }; Object.freeze(o);
run(() => { o.a = 2; console.log(show(o.a)); });
