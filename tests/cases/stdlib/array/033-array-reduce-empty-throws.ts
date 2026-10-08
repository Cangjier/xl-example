// xl:title 空数组 reduce 不给初值：抛 TypeError
// xl:judge stdout
// xl:end

try {
  [].reduce((a: number, b: number) => a + b);
} catch (e) {
  console.log((e as Error).name);
}
console.log([].reduce((a: number, b: number) => a + b, 10));
