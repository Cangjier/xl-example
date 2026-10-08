// xl:title namespace 里有运行期东西：对象、函数、内部引用
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Utils {
  export const version = 2;
  export function add(a: number, b: number) { return a + b; }
  export const doubled = add(version, version);
}
console.log(Utils.version, Utils.add(1, 2), Utils.doubled);
