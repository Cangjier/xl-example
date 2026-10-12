// xl:title const enum 与带常量表达式的成员
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
const enum Level { Low = 1, Mid = Low + 1, High = Mid * 2 }
enum Computed { A = "x".length, B = 2 + 3, C = 1 << 4 }
console.log(Level.Mid, Level.High, Computed.A, Computed.B, Computed.C, Computed[5]);
console.log(Object.keys(Computed).join(","));
