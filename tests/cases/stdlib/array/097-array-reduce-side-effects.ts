// xl:title reduce 的初值省略 / 空数组 / 稀疏数组
// xl:round 653
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([].reduce((a, b) => a + b, 10));
try { [].reduce((a: any, b: any) => a + b); } catch (e) { console.log((e as Error).constructor.name); }
const holes = [1, , 3];
console.log(holes.reduce((a, b) => a + b, 0), holes.filter(() => true).length);
console.log([1, 2].reduce((a, b, i) => a + b + i, 0));
