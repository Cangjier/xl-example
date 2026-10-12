// xl:title instanceof 的右操作数是全局构造器 `Function`（写在 instanceof 右边）
// xl:round 7
// xl:judge stdout
// xl:end

class C {}
const c = new C();
console.log(typeof Function, c instanceof C);
console.log(C instanceof Object, C instanceof Function);
