// xl:title 混入模式：类表达式与 Object.assign 组合
// xl:round 323
// xl:judge stdout
// xl:end

type Ctor = new (...args: any[]) => any;
function Tagged<T extends Ctor>(Base: T) {
  return class extends Base { tag = "t"; };
}
class Plain { v = 1; }
const Mixed = Tagged(Plain);
const m = new Mixed();
console.log(m.tag, m.v, m instanceof Plain);
