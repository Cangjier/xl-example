// xl:title 非空断言落在链的每一段上
// xl:round 371
// xl:judge stdout
// xl:end
const data: { a?: { b?: { c?: number[] } | null } } = { a: { b: { c: [1, 2, 3] } } };
console.log(data.a!.b!.c![0]);
console.log(data.a?.b?.c?.length);
console.log(data!.a!.b!.c!.slice(1).length);
const fn: (() => { k: number }) | null = () => ({ k: 7 });
console.log(fn!().k, fn?.().k);
