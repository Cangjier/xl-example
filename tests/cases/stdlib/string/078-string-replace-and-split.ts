// xl:title replace 的三种形态：字符串、$&、函数
// xl:round 323
// xl:judge stdout
// xl:end

console.log("a-b".replace("-", "+"), "aaa".replace("a", "$&$&"), "a1b2".replace("1", "#"));
console.log("a1b2".split("1").join("|"), "a,b,,c".split(",").length, "abc".split("").join("-"));
