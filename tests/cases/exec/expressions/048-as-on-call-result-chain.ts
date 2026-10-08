// xl:title `as` 落在调用结果与后续成员链上
// xl:round 305
// xl:judge stdout
// xl:end

const f = () => ({ a: 1, b: { c: 2 } });
console.log((f() as { a: number }).a, (f() as any).b.c, (f() as any).b["c"]);
