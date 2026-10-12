// xl:title 类的字段 / 访问器 / 继承 / 静态成员的形状
// xl:round 291
// xl:judge stdout
// xl:end

class A { x = 1; static s = 2; get y() { return this.x + 1; } set y(v) { this.x = v; } }
class B extends A { constructor() { super(); this.z = 3; } }
const b = new B();
console.log(b.x, b.y, b.z, A.s, b instanceof A, Object.getPrototypeOf(B) === A);
