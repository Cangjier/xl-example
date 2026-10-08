// xl:title 元组类型与 readonly 数组：类型位只擦掉
// xl:judge stdout
// xl:end

type Pair = readonly [string, number];
const p: Pair = ["k", 1];
const xs: readonly number[] = [1, 2, 3];
console.log(p[0], p[1], xs.length, xs.reduce((a, b) => a + b, 0));
const asConst = [1, "a"] as const;
console.log(asConst[0], asConst.length);
