// xl:title 抽象类的 `protected` 成员在子类里用
// xl:round 305
// xl:judge stdout
// xl:end

abstract class Base {
  protected label = "base";
  abstract run(): string;
  describe(): string { return this.label + ":" + this.run(); }
}
class Impl extends Base {
  run(): string { return "impl"; }
}
console.log(new Impl().describe());
