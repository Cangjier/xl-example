// xl:title for..in 沿原型链且去重
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const p = { a: 1, b: 2 }; const o = Object.create(p); o.b = 3; o.c = 4;
const out = []; for (const k in o) out.push(k + "=" + o[k]);
console.log(show(out.join("|")));
