// xl:title `override` 修饰符：运行期一个字都不留
// xl:round 304
// xl:judge stdout
// xl:end

class Base { greet(): string { return "base"; } }
class Derived extends Base {
  override greet(): string { return "derived+" + super.greet(); }
}
console.log(new Derived().greet());
