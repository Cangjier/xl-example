// xl:title 接口继承泛型接口，类再 implements
// xl:judge stdout
// xl:end

interface A<T> { a: T }
interface B<T> extends A<T> { b: T }
class C implements B<number> { a = 1; b = 2 }
const c = new C();
console.log(c.a + c.b);
