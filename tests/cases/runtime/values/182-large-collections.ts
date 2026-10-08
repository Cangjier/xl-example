// xl:title 大集合的压力：一万条 Map / Set / 数组
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map<number, number>();
for (let i = 0; i < 10000; i++) m.set(i, i * 2);
console.log(m.size, m.get(9999), m.has(10000));
const s = new Set<number>();
for (let i = 0; i < 10000; i++) s.add(i % 1000);
console.log(s.size, s.has(999), s.has(1000));
const arr: number[] = [];
for (let i = 0; i < 10000; i++) arr.push(i);
console.log(arr.length, arr[9999], arr.reduce((a, b) => a + b, 0));
