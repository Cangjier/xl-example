// xl:title 数值枚举：自动编号、显式值、反向映射
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
enum Color { Red, Green = 5, Blue }
enum Flags { None = 0, A = 1 << 0, B = 1 << 1, Both = A | B }
const c: Color = Color.Green;
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[0], Color[6]);
console.log(Flags.A, Flags.B, Flags.Both, Flags[2], Object.keys(Color).join(","));
console.log(c === Color.Green);
