// xl:title Array.slice（不改原数组）/ splice（改）
// xl:judge stdout
// xl:end

const xs = [0, 1, 2, 3, 4];
console.log(xs.slice(1, 3).join(","), xs.slice(-2).join(","), xs.slice().join(","), xs.join(","));
console.log(xs.splice(1, 2, "a").join(","), xs.join(","));
console.log([1, 2, 3].splice(-1).join(","));
