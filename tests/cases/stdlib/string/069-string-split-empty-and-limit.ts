// xl:title `split` 的分隔符为空串与 limit
// xl:round 305
// xl:judge stdout
// xl:end

console.log(JSON.stringify("abc".split("")), JSON.stringify("a,b,c".split(",", 2)), JSON.stringify("".split(",")));
