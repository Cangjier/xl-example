// xl:title 字符串的迭代器按码点切分
// xl:round 623
// xl:judge stdout
// xl:end

console.log([..."a😀b"].length, "a😀b".length);
console.log([..."abc"].join("-"), Array.from("😀").length);
