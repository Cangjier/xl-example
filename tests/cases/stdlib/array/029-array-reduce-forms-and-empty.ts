// xl:title reduce / reduceRight 的四种形态（含空数组抛错）
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
console.log(["a", "b", "c"].reduceRight((a, b) => a + b));
console.log([1].reduce((a, b) => a + b), [1].reduce((a, b) => a + b, 100));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log(e.name); }
