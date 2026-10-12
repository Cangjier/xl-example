// xl:title abstract class + implements：接口只擦掉、抽象方法由子类补
// xl:judge stdout
// xl:end

interface Runner { run(): string }
abstract class Base implements Runner {
  abstract run(): string;
  go() { return "go:" + this.run(); }
}
class Impl extends Base { run() { return "impl"; } }
console.log(new Impl().go(), new Impl().run());
