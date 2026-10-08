// xl:title defineProperty 之后 for..in
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
const out = []; for (const k in a) out.push(k);
console.log(show(out.join("|")));
