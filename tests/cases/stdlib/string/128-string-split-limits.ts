// xl:title split 的空串分割、上限与相邻分隔符
// xl:round 8
// xl:judge stdout
// xl:end

console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify(",a,,b,".split(",")));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("abc".split("", 0)));
console.log(JSON.stringify("no-sep".split(";")));
