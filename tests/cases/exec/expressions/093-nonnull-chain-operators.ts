// xl:title 非空断言链接二元 / 下标 / 调用
// xl:round 651
// xl:judge stdout
// xl:end

const o: any = { a: { b: () => ({ c: [1, 2] }) }, n: 2 };
console.log(o.a!.b().c[0] + 1, o.a!.n + 1, o.a!["n"] + 1, typeof o.a!.b().c.at(-1));
