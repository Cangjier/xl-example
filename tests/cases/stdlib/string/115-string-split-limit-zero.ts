// xl:title split 的 limit 与省略分隔符
// xl:round 647
// xl:judge stdout
// xl:end

console.log(JSON.stringify("a,b,c".split(",", -1)));
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split(undefined)));
console.log(JSON.stringify("".split("")));
console.log(JSON.stringify("a,b,".split(",")));
