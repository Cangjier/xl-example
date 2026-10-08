// xl:title replace 的替换值是函数
// xl:judge stdout
// xl:end

console.log("abc".replace("b", (m) => m.toUpperCase()));
console.log("a-b-c".replace("-", (m, i) => "<" + i + ">"));
