// xl:title 断言出现在运算符的操作数位上
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
const a: unknown = 1;
const b: unknown = 2;
console.log((a as number) + (b as number));
console.log(<number>a + <number>b);
console.log(((a as number) + 1) * 2);
const s: unknown = "x";
console.log((s as string).length + 1, (s as string) + "!");
console.log(({ n: 1 } as { n: number }).n + (2 as number));
