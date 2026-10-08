// xl:title 不用装饰器的混入：类表达式 + 泛型构造器签名
// xl:round 371
// xl:judge stdout
// xl:end
type Ctor<T = {}> = new (...args: any[]) => T;
function Timestamped<TBase extends Ctor>(Base: TBase) {
  return class extends Base {
    createdAt = 1000;
    stamp(): string { return "t" + this.createdAt; }
  };
}
function Tagged<TBase extends Ctor>(Base: TBase) {
  return class extends Base {
    tag = "x";
    describe(): string { return this.tag; }
  };
}
class Plain { v = 1; }
const Mixed = Tagged(Timestamped(Plain));
const m = new Mixed();
console.log(m.v, m.createdAt, m.stamp(), m.tag, m.describe(), m instanceof Plain);
