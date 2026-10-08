// xl:title readonly 数组形参：类型位擦掉、值照走
// xl:judge stdout
// xl:end

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
const xs: readonly number[] = [1, 2, 3];
console.log(sum(xs), sum([4, 5]));
