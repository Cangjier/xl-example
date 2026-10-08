// xl:title Object.isFrozen / isSealed / isExtensible 三问
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: 1 }; Object.seal(o);
console.log(show(Object.isSealed(o)) + "," + show(Object.isFrozen(o)) + "," + show(Object.isExtensible(o)));
