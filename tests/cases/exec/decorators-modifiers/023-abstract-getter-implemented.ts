// xl:title 抽象类里的抽象 getter，子类实现它
// xl:round 305
// xl:judge stdout
// xl:end

abstract class Base {
  abstract get value(): number;
}
class Impl extends Base {
  get value(): number { return 42; }
}
console.log(new Impl().value);
