// xl:title `split` 的 limit 与空串
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("".split(",")));
console.log(JSON.stringify("a,,b".split(",")));
