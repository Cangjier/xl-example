// xl:title 解构形参：对象 / 数组 / 默认值 / 剩余
// xl:judge stdout
// xl:end

function g({ a, b = 2 }: { a: number; b?: number }, [c, ...rest]: number[]): string {
  return a + "," + b + "," + c + "," + rest.join("");
}
console.log(g({ a: 1 }, [3, 4, 5]));
console.log((( { x }: any ) => x)({ x: 9 }));
