// xl:title 一个类 implements 两个接口
// xl:round 304
// xl:judge stdout
// xl:end

interface Named { name: string }
interface Aged { age: number }
class Person implements Named, Aged {
  name: string;
  age: number;
  constructor(name: string, age: number) { this.name = name; this.age = age; }
}
const p: Named & Aged = new Person("kim", 30);
console.log(p.name, p.age, p instanceof Person);
