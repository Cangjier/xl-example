// xl:title implements 多个接口 + 接口继承
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

interface Named { name: string }
interface Aged { age: number }
interface Employee extends Named, Aged { id: number }
class Person implements Named, Aged {
  constructor(public name: string, public age: number) {}
}
const e: Employee = { name: "k", age: 1, id: 2 };
const p = new Person("a", 3);
console.log(p.name, p.age, e.id, e.name);
