// xl:title super.x = v 落在父类原型那一格上
// xl:round 304
// xl:judge stdout
// xl:end

class A { set label(v: string) { console.log("A.set", v); } }
class B extends A { set label(v: string) { super.label = v.toUpperCase(); } }
const b = new B();
b.label = "hi";
