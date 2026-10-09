// xl:title 展开：对象的次序与覆盖、可迭代物的展开
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { ...{ a: 1, b: 2 }, ...{ b: 3 }, c: 4 };
console.log(show(JSON.stringify(o)));

(() => {
console.log(show(JSON.stringify({ ...null, ...undefined, a: 1 })));
})();

(() => {
console.log(show(JSON.stringify([...[1, 2], 3])) + "," + show(JSON.stringify([...new Set([1, 2])])));
})();
