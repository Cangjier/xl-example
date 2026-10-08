// xl:title enum 与 namespace 的运行期取值
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
enum Flag { A = 1, B = 2, Both = A | B }
namespace Util {
  export const tag = "u";
  export function twice(n: number): number { return n * 2; }
  export namespace Inner { export const deep = 3; }
}
console.log(Color.Red, Color.Green, Color.Blue, Color[5]);
console.log(Flag.A, Flag.Both, Flag[3]);
console.log(Util.tag, Util.twice(4), Util.Inner.deep);
