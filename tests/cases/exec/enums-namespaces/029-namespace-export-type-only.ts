// xl:title 命名空间里只有类型：那个名字运行期不存在
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Types {
  export type Id = number;
  export interface Row { id: Id }
}
const n: Types.Row = { id: 1 };

namespace Mixed {
  export type T = string;
  export const value = 42;
}
console.log(n.id, Mixed.value, JSON.stringify(Mixed));
