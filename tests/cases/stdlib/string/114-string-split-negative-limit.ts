// xl:title split 的 limit：负数是「不限」、0 是一段都不收、超过段数照给
// xl:round 647
// xl:judge stdout
// xl:end

console.log(JSON.stringify("a,b,c".split(",", -1)));
console.log(JSON.stringify("a,b,c".split(",", 0)));
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("a,b,c".split(",", 9)));
console.log(JSON.stringify("abc".split("", -1)), JSON.stringify("abc".split("", 0)));
