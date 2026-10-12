// xl:title 实参位上的 `as` 与尖括号之外的两种断言形状
// xl:round 305
// xl:judge stdout
// xl:end

function take(v: unknown): string { return typeof v; }
console.log(take(1 as unknown), take("s" as unknown), take(({ a: 1 } as unknown)));
