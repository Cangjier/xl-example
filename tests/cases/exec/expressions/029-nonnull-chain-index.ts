// xl:title 非空断言串在成员链上：o!.a!.b![1]
// xl:judge stdout
// xl:end

const o: any = { a: { b: [1, 2] } };
console.log(o!.a!.b![1]);
