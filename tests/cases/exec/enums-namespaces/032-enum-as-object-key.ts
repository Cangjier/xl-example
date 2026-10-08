// xl:title 用枚举值当对象的计算键
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green }
const names: Record<number, string> = { [Color.Red]: "red", [Color.Green]: "green" };
console.log(names[Color.Red], names[Color.Green], Color[1]);
