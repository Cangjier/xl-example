// xl:title 非空断言与 as 断言：一整串 ! 与 as unknown as 都不产生运行期代码
// xl:round 7
// xl:judge stdout
// xl:end

const o: { a?: { b?: number } } = { a: { b: 2 } };
const v: number = o!.a!.b!;
const s = "abc" as unknown as number;
const arr = [1, 2] as number[];
console.log(v, typeof s, arr.length);
