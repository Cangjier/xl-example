// xl:title 命名空间里同时有 `enum` 与引用它的 `const`
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Outer {
  export enum E { A = 1, B = 2 }
  export const v = E.A + 10;
}
console.log(Outer.v, Outer.E.A, Outer.E[2]);
