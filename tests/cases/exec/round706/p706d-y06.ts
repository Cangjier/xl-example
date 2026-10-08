// xl:title defineProperty 造出的格子是哪些键
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; Object.defineProperty(a, 0, { value: 5 });
console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
