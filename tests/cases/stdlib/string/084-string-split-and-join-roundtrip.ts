// xl:title 字符串与数组之间的往返
// xl:round 331
// xl:judge stdout
// xl:end

const text = "a,b,,c";
console.log(JSON.stringify(text.split(",")));
console.log(text.split(",").join("|"));
console.log("  padded  ".trim().split(" ").join("-"));
console.log("a-b-c".split("-", 2).join("+"));
