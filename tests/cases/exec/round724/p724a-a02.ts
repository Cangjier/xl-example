// xl:title 展开实参 + `as` 落在内建与方法的接收者上
// xl:round 724
// xl:judge stdout
// xl:end
const xs: any = [1, 2, 3];
console.log(Math.max(...[1, 5, 3] as any));
console.log(Math.max(...xs as any));
const o: any = { m(...a: any[]) { return a.length + ":" + a.join("|"); }, f(a: any, b: any) { return a + ":" + b; } };
console.log(o.m(...[1, 2] as any));
console.log(o.m(...xs as any));
console.log(o.f(...[1, 2] as any));
const arrow = (...a: any[]) => a.join("|");
console.log(arrow(...[1, 2] as any));
console.log((new Set([1, 2]) as any).size, [...new Set([1, 2])].join("|"));
