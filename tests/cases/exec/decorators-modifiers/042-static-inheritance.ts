// xl:title 静态成员与静态方法的继承
// xl:round 623
// xl:judge stdout
// xl:end

class A { static v = 1; static m() { return this.v; } }
class B extends A {}
console.log(B.v, B.m(), Object.getPrototypeOf(B) === A);
