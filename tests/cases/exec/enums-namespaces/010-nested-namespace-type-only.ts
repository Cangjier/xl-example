// xl:title namespace 只用类型位的那一半（`export type` / `export interface`）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Types {
  export type Id = string | number;
  export interface Box { v: number }
}
const id: Types.Id = 1;
const b: Types.Box = { v: 2 };
console.log(id, b.v);
