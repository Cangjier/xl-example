// xl:title 字符串枚举与异构枚举：只有数值那一半有反向映射
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
enum S { A = "a", B = "b" }
enum H { N = 1, T = "t" }
console.log(S.A, S.B, S["A"], Object.keys(S).join(","), S[0]);
console.log(H.N, H.T, H[1], H["T"], Object.keys(H).join(","));
console.log(S.A === "a", H.N === 1);
