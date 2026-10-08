// xl:title for..in 跳过不可枚举与符号
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: 1 }; Object.defineProperty(o, "b", { value: 2, enumerable: false }); o[Symbol("s")] = 3;
const out = []; for (const k in o) out.push(k);
console.log(show(out.join("|")));
