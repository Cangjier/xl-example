// xl:title readonly 数组 / 元组 / 具名元组成员 / 变长元素
// xl:judge stdout
// xl:end

const xs: readonly number[] = [1, 2, 3];
const t: readonly [number, string] = [1, "a"];
const tup: [a: number, b?: string, ...rest: number[]] = [1, "z", 3, 4];
console.log(xs.length, t[1], tup[0], tup[2], xs.reduce((a, b) => a + b, 0));
