// xl:title 类那两格与 `prototype`（`name` / `length` / 自有名表）
// xl:round 731
// xl:judge stdout
// xl:end
class C { constructor(a: number, b: number) {} }
console.log(C.name, C.length, typeof C.prototype);
const anon = class {};
console.log(JSON.stringify(anon.name), anon.length);
console.log(Object.getOwnPropertyNames(C).join(","));
