// xl:title 可选链的短路边界与调用链
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: { b: 1 } };
console.log(show(o?.a?.b) + "," + show(o?.x?.b) + "," + show(o.x?.b));

(() => {
const o = { a: 0, b: "", c: false };
console.log(show(o.a?.toString()) + "," + show(o.b?.length) + "," + show(o.c?.valueOf()));
})();

(() => {
const o = { f: () => 1, a: [7] };
console.log(show(o.f?.()) + "," + show(o.a?.[0]) + "," + show(o.g?.()));
})();

(() => {
const o = { a: [{ f: () => ({ v: 3 }) }] };
console.log(show(o.a[0].f().v));
})();

(() => {
const o = { f() { return { v: 1 }; } };
console.log(show(o["f"]().v));
})();
