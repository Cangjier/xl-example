// xl:title reduce / reduceRight：空数组与初值的有无
// xl:round 371
// xl:judge stdout
// xl:end
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([1, 2, 3].reduceRight((a, b) => a - b));
try { ([] as number[]).reduce((a, b) => a + b); } catch (e) { console.log((e as Error).name); }
console.log(([] as number[]).reduce((a, b) => a + b, 5));
console.log([1, , 3].reduce((a: number, b: number) => a + b, 0));
