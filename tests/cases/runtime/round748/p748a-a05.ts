// xl:title `instanceof`：原始值、箭头函数、`null` 原型三格
// xl:round 748
// xl:judge stdout
// xl:end
console.log(1 instanceof Number, "s" instanceof String, true instanceof Boolean);
class A {}
class B extends A {}
console.log(new B() instanceof A, new B() instanceof B, {} instanceof Object, [] instanceof Array);
console.log((() => {}) instanceof Function, A instanceof Function);
const n: any = Object.create(null);
console.log(n instanceof Object, (null as any) instanceof Object);
