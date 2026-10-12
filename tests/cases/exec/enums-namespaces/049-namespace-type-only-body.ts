// xl:title 只有类型的 namespace 体是空操作
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
namespace Types { export interface A { x: number } export type B = string; }
namespace Mixed { export type T = number; export const value = 7; }
const a: Types.A = { x: 1 };
const b: Types.B = "s";
console.log(a.x, b, Mixed.value, typeof (Types as any), Object.keys(Mixed).join(","));
