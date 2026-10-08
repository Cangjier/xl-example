// xl:title 数值枚举的反向映射与字符串枚举
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
enum Name { A = "a", B = "b" }
console.log(Color.Red, Color.Green, Color.Blue, Color[5]);
console.log(Name.A, Name.B);
