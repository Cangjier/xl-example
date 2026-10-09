// xl:title bind 的偏应用与 this 固定；bound 的 length / name
// xl:round 323
// xl:judge stdout
// xl:end

function add(a: number, b: number, c: number) { return a + b + c; }
const f = add.bind(null, 1);
console.log(f(2, 3), f.length, f.name);
const o = { v: 5, get() { return this.v; } };
const g = o.get.bind(o);
console.log(g(), g.name);
