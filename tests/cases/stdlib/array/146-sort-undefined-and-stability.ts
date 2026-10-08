// xl:title `sort` 里 `undefined` 一律排到最后（不调比较器）
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [3, undefined, 1, undefined, 2];
let sawUndefined = false;
console.log(JSON.stringify(a.sort((x: any, y: any) => { if (x === undefined || y === undefined) sawUndefined = true; return x - y; })), sawUndefined);
const h: any = [3, , 1];
h.sort();
console.log(JSON.stringify(h), 1 in h);
const m: any = [undefined, , , 2];
m.sort();
console.log(JSON.stringify(m), 1 in m);
