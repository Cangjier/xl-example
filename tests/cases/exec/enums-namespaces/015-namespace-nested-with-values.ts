// xl:title 嵌套 namespace：外层套内层、两层的值都能取到
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Outer {
  export namespace Inner {
    export const v = "deep";
    export function f() { return v + "!"; }
  }
  export const top = "top";
}
console.log(Outer.top, Outer.Inner.v, Outer.Inner.f());
