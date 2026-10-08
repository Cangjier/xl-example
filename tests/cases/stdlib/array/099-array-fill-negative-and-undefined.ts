// xl:title Array.fill：负下标 / 越界 / 不写值就是 undefined
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4];
console.log(a.fill(0, -2).join(","), a.join(","));
console.log([1, 2, 3].fill(9, 1, 1).join(","), [1, 2].fill(9, -1, -1).join(","));
console.log([1, 2].fill(undefined).map((v) => String(v)).join(","));
