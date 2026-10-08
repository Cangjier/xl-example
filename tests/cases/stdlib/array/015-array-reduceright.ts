// xl:title reduceRight 的方向与初值
// xl:judge stdout
// xl:end

const xs = ["a", "b", "c"];
console.log(xs.reduceRight((acc, v) => acc + v, ""));
console.log([1, 2, 3].reduceRight((a, b) => a - b), [1, 2, 3].reduceRight((a, b) => a - b, 10));
