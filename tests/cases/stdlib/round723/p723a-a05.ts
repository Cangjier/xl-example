// xl:title `freeze` / `seal` / `preventExtensions` 之后 `push` 都抛
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const free = [1];
Object.freeze(free);
run(() => { free.push(2); console.log("f:" + free.length); });
const sealed = [1];
Object.seal(sealed);
run(() => { sealed.push(2); console.log("s:" + sealed.length); });
const pe = [1];
Object.preventExtensions(pe);
run(() => { pe.push(2); console.log("p:" + pe.length); });
