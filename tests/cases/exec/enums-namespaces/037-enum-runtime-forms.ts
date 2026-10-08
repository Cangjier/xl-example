// xl:title enum 的运行期：正向、反向映射、字符串枚举
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
enum Name { A = "a", B = "b" }
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[0]);
console.log(Name.A, Name.B, (Name as any)[0]);
