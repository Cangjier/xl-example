// xl:title enum 各种形态：自动编号 / 字符串值 / 反向映射 / 表达式初值
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
enum Dir { Up = "UP", Down = "DOWN" }
enum Calc { A = 1 << 2, B = A | 1 }
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[0]);
console.log(Dir.Up, Dir.Down, typeof Dir.Up);
console.log(Calc.A, Calc.B);
