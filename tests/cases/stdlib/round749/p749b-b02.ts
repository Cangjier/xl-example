// xl:title `Array.prototype` 的 `reduce` 家族的空数组与初值
// xl:round 749
// xl:judge stdout
// xl:end
console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
try { [].reduce((a: any, b: any) => a + b); } catch (e) { console.log("empty", (e as Error).constructor.name); }
console.log([].reduce((a: any, b: any) => a + b, "init"));
console.log([1, 2].reduceRight((a, b) => a + "-" + b), ["a", "b"].reduceRight((a, b) => a + b, "z"));
console.log([[1], [2]].flatMap((v) => v).join(","), [1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log([1, 2, 3].every((v) => v > 0), [1, 2, 3].some((v) => v > 2), [].every(() => false), [].some(() => true));
