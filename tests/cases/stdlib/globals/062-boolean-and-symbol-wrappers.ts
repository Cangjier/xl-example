// xl:title 包装对象：`new Number(0)` / `new Boolean(false)` 的真假
// xl:round 691
// xl:judge stdout
// xl:end
const n: any = new Number(0);
const b: any = new Boolean(false);
console.log(n ? "truthy" : "falsy", b ? "truthy" : "falsy");
console.log(n + 1, b == false, typeof n, typeof b);
console.log(Number.prototype.valueOf.call(n), Boolean.prototype.valueOf.call(b));
