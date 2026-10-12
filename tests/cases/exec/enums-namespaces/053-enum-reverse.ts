// xl:title 数字枚举的反向映射与字符串枚举
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum E { A, B = 5, C }
enum S { X = "x", Y = "y" }
console.log(E.A, E.B, E.C, E[0], E[5]);
console.log(S.X, S.Y, JSON.stringify(E));
