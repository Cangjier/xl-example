// xl:title 非空断言与下标 / 成员混在同一条链上
// xl:round 323
// xl:judge stdout
// xl:end

const arr: any = [[1, 2]];
console.log(arr![0]![0]);
const o: any = { a: { b: [7] } };
console.log(o!.a!.b![0], o?.a.b![0]);
