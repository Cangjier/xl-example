// xl:title call / apply / bind 的 this 与部分实参
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function f(a, b) { return this.v + ":" + a + ":" + b; }
const g = f.bind({ v: 1 }, 2);
console.log(show(g(3)) + "," + show(g.length) + "," + show(g.name));

(() => {
function f(a, b) { return this.v + a + b; }
console.log(show(f.call({ v: 1 }, 2, 3)) + "," + show(f.apply({ v: 1 }, [2, 3])));
})();
