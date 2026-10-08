// xl:title namespace 带值：导出、内层、嵌套
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
namespace Outer {
  export const a = 1;
  export function f(): number { return a + 1; }
  export namespace Inner {
    export const b = 2;
    export const g = (): number => b * 3;
  }
}
console.log(Outer.a, Outer.f(), Outer.Inner.b, Outer.Inner.g());
