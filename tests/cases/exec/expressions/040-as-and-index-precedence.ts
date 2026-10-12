// xl:title as / 非空断言与下标、成员访问的优先级
// xl:round 291
// xl:judge stdout
// xl:end

const x: any = { a: [1, 2, 3] };
console.log((x as any).a.length, x!.a[0], (x as any)["a"][1]);
