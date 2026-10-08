// xl:title 整数键升序排在字符串键之前
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { b: 2, 10: "ten", 2: "two", a: 1 };
console.log(show(Object.keys(o).join("|")) + " / " + show(JSON.stringify(o)));
