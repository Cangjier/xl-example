// xl:title `splice` 的实参个数口径：不给 / 给一个 / 给 undefined
// xl:round 376
// xl:judge stdout
// xl:end
const a = [1, 2, 3, 4];
console.log("A", JSON.stringify(a.splice()), JSON.stringify(a));
const b = [1, 2, 3];
console.log("B", JSON.stringify(b.splice(1)), JSON.stringify(b));
const c = [1, 2, 3];
console.log("C", JSON.stringify(c.splice(1, undefined)), JSON.stringify(c));
const d = [1, 2, 3];
console.log("D", JSON.stringify(d.splice(1, 0, 9)), JSON.stringify(d));
const e = [1, 2, 3];
console.log("E", JSON.stringify(e.splice(-2)), JSON.stringify(e));
const f = [1, 2, 3];
console.log("F", JSON.stringify(f.splice(5)), JSON.stringify(f));
const g = [1, 2, 3];
console.log("G", JSON.stringify(g.splice(0, 99)), JSON.stringify(g));
