// xl:title namespace：要真的造一个对象出来（含嵌套与导出）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Outer {
  export const a = 1;
  export function f(): number { return a + 1; }
  export namespace Inner { export const b = 2; }
  const hidden = 9;
}
console.log(Outer.a, Outer.f(), Outer.Inner.b, typeof Outer.hidden);
