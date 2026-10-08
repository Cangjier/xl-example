// xl:title findLast / findLastIndex / flatMap 上的空结果与展平
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 9), xs.findLastIndex((v) => v > 9));
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log([1, 2].flatMap((v) => (v > 1 ? [v] : [])).join(","));
