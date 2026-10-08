// xl:title enum / const enum 的运行期取值与反向映射
// xl:round 9
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
const enum Flag { A = 1, B = 2 }
console.log(Color.Red, Color.Green, Color.Blue, Color[0], Color[5]);
console.log(Flag.A | Flag.B, Flag.A & Flag.B);
