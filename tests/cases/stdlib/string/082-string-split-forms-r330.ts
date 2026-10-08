// xl:title `split` 的空分隔符、上限与连续分隔符
// xl:round 330
// xl:judge stdout
// xl:end

console.log("abc".split("").join("-"));
console.log("a,b,,c".split(",").length, "a,b,,c".split(",")[2]);
console.log("a-b-c".split("-", 2).join("|"));
console.log("".split(",").length, "abc".split("").length);
