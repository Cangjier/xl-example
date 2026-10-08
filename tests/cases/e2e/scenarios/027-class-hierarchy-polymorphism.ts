// xl:title 端到端：抽象基类 + 三个子类 + 多态分派与排序
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

abstract class Employee {
  constructor(public name: string, protected base: number) {}
  abstract pay(): number;
  label(): string { return this.name + ":" + this.pay(); }
}
class Salaried extends Employee { pay() { return this.base; } }
class Hourly extends Employee {
  constructor(name: string, base: number, private hours: number) { super(name, base); }
  pay() { return this.base * this.hours; }
}
class Commission extends Salaried {
  constructor(name: string, base: number, private sales: number) { super(name, base); }
  pay() { return super.pay() + this.sales * 0.1; }
}
const staff: Employee[] = [new Salaried("a", 100), new Hourly("b", 10, 5), new Commission("c", 50, 200)];
for (const e of staff.sort((x, y) => y.pay() - x.pay())) console.log(e.label(), e instanceof Salaried);
console.log(staff.reduce((sum, e) => sum + e.pay(), 0));
