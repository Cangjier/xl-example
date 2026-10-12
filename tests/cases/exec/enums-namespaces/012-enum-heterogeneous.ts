// xl:title 异构 enum（数字 + 字符串成员）与反向映射
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Mixed { A = 1, B = 2, C = "c" }
console.log(Mixed.A, Mixed.B, Mixed.C, Mixed[1], Mixed[2], Mixed["c"]);
