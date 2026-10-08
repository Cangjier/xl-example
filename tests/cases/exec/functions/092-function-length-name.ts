// xl:title `length` / `name` 在有默认值与剩余参数时
// xl:round 691
// xl:judge stdout
// xl:end
function a(x: any): void {}
function b(x: any = 1): void {}
function c(...xs: any[]): void {}
const d = (x: any, y: any = 2) => {};
console.log(a.length, b.length, c.length, d.length);
console.log(a.name, d.name, (function () {}).name);
