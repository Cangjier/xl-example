// xl:title 字符串的迭代器按码点切分
// xl:round 623
// xl:judge stdout
// xl:end

console.log([..."a😀b"].length, "a😀b".length);
console.log([..."abc"].join("-"), Array.from("😀").length);
// 第 787 轮并进来的两条（`stdlib/string/probe693-y46` 与 `runtime/iterators/probe696-i01`，
// 两份正文逐字节相同、只差分隔符——按判定点算同一条，落在这里）
console.log([..."ab"].join("|"));
