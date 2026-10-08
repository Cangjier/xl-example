// xl:title every / some / reduce：空数组与初值
// xl:round 9
// xl:judge stdout
// xl:end

console.log([].every(() => false), [].some(() => true));
console.log([1, 2, 3].every((x) => x > 0), [1, 2, 3].some((x) => x > 2));
try { [].reduce((a: number, b: number) => a + b); } catch (e) { console.log((e as Error).name); }
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([1, 2, 3].reduceRight((a, b) => a + "" + b));
