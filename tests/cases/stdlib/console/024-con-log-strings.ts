// xl:title 字符串里的引号与换行（顶层不加引号，嵌套加单引号）
// xl:round 691
// xl:judge stdout
// xl:end
console.log("a'b");
console.log({ s: "a'b" });
console.log({ s: "a\nb" });
console.log("a\nb");
