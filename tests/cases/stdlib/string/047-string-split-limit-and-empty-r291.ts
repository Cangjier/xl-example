// xl:title split：limit、空串源、空串分隔
// xl:round 291
// xl:judge stdout
// xl:end

console.log("a,b,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "".split(",").length, "a".split("").length);
