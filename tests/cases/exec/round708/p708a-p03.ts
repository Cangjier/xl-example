// xl:title 可选调用与可选下标
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { f: () => 1, a: [7] };
console.log(show(o.f?.()) + "," + show(o.a?.[0]) + "," + show(o.g?.()));
