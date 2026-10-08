// xl:note `new` 与类型名之间夹一条注释：仍是一个 New（第 631 轮）
// xl:expect New,NewType,NewArguments,AreaAnnotation
class A {
  constructor(public v: number) {}
}
const a = new /* c */ A(1);
const b = new /* c */ A();
const c = new /* c */ (A)(2);
