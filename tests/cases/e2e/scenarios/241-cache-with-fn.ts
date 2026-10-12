// xl:title 函数缓存：Map + rest + apply
// xl:round 682
// xl:judge stdout
// xl:end
function memo(fn: any): any { const cache: Map<string, any> = new Map(); return function (this: any, ...args: any[]) { const key = args.join(','); if (!cache.has(key)) cache.set(key, fn.apply(this, args)); return cache.get(key); }; }
let calls = 0;
const slow = memo((a: number, b: number) => { calls++; return a * b; });
console.log(slow(2, 3), slow(2, 3), slow(4, 5), calls);
