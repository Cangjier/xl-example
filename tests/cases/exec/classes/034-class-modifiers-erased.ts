// xl:title 类上的修饰词与实现子句：运行期只见成员
// xl:round 331
// xl:judge stdout
// xl:end

interface Named { name: string }
abstract class Base implements Named {
  abstract kind(): string;
  name = "base";
}
class Kid extends Base {
  kind(): string {
    return "kid";
  }
}
const kid: Base = new Kid();
console.log(kid.kind(), kid.name, kid instanceof Base, kid instanceof Kid);
