// xl:title 可选链短路时右侧不执行
// xl:round 691
// xl:judge stdout
// xl:end
let calls = 0;
const f = (x: any): any => { calls++; return x.y; };
const o: any = null;
console.log(o?.a, calls);
console.log((null as any)?.a.b.c, calls);
const g: any = { h: null };
console.log(g.h?.(), calls);
