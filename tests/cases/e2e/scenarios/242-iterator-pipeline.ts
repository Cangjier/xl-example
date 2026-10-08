// xl:title 自定义可迭代物组成的管道：map / filter / take
// xl:round 683
// xl:judge stdout
// xl:end
function* naturals() { let i = 1; while (true) { yield i++; } }
function take(iterable: any, n: number): any[] { const out: any[] = []; for (const v of iterable) { if (out.length >= n) break; out.push(v); } return out; }
const first = take(naturals(), 5);
console.log(first.join(','), first.length);
