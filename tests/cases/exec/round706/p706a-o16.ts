// xl:title defineProperties 一次多个
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { value: 2, enumerable: true } });
console.log(show(JSON.stringify(o)));
