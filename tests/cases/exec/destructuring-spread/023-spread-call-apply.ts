// xl:title 展开实参、`Math.max` 与 `apply`
// xl:round 691
// xl:judge stdout
// xl:end
const xs: any = [3, 1, 2];
console.log(Math.max(...xs), Math.min(...xs), Math.max.apply(null, xs));
function f(a: any, ...rest: any[]): string { return a + ":" + rest.length; }
console.log(f(...xs));
console.log(JSON.stringify([0, ...xs, 9]));
