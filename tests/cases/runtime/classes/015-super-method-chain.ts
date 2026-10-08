// xl:title super 方法调用：两层各加一段、this 一直是子类实例
// xl:judge stdout
// xl:end

class A { tag() { return "A"; } who() { return "who-" + this.tag(); } }
class B extends A { tag() { return "B" + super.tag(); } }
class C extends B { tag() { return "C" + super.tag(); } }
console.log(new C().tag(), new C().who());
