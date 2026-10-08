// xl:title 类型谓词写在箭头上、当回调传
// xl:judge stdout
// xl:end

const isNum = (x: unknown): x is number => typeof x === "number";
console.log([1, "a", 2].filter(isNum).join(","));
