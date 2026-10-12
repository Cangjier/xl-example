// xl:title enum 成员的初始化式是算出来的（反向映射那一格）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const BASE = 10;
enum E { A = BASE, B = BASE * 2, C = 1 + 1 }
console.log(E.A, E.B, E.C, E[10], E[20], E[2]);
