// xl:title 接口继承多个接口，类实现它
// xl:round 305
// xl:judge stdout
// xl:end

interface A { a: number; }
interface B { b: string; }
interface C extends A, B { c: boolean; }
class Impl implements C {
  a = 1;
  b = "x";
  c = true;
}
const v: C = new Impl();
console.log(v.a, v.b, v.c);
