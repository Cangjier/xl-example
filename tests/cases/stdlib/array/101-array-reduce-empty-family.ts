// xl:title Array.reduce：空数组无初值抛 TypeError、有初值拿初值
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a: number, b: number) => a + b, 0));
try { [].reduce((a: number, b: number) => a + b); } catch (e) { console.log("no-init:" + (e as Error).name); }
try { [].reduceRight((a: number, b: number) => a + b); } catch (e) { console.log("right:" + (e as Error).name); }
console.log(["a", "b"].reduceRight((a, b) => a + b));
