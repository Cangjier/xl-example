// xl:title `freeze` / `seal` / `preventExtensions` 之后**加新下标**都不动
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const free = [1];
Object.freeze(free);
free[1] = 2;
console.log("frozen", show(free.length) + "," + show(free[1]) + "," + show(JSON.stringify(free)));
const sealed = [1];
Object.seal(sealed);
sealed[1] = 2;
console.log("sealed", show(sealed.length) + "," + show(sealed[1]));
const pe = [1];
Object.preventExtensions(pe);
pe[1] = 2;
console.log("preventExtensions", show(pe.length) + "," + show(pe[1]));
