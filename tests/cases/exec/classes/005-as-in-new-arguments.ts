// xl:title `new` 的实参位里带 `as`（一整个实参 = 好几格）
// xl:judge stdout
// xl:end

const m = new Map([[1, "a"]] as any);
console.log(m.get(1), m.size);
const s = new Set([1, 2] as any);
console.log(s.size);
function box(v: number): { v: number } { return { v }; }
console.log(new (box as any)(7).v);
