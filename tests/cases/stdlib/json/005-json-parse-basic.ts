// xl:title JSON.parse：对象 / 数组 / 标量 / 嵌套 / 空白
// xl:judge stdout
// xl:end

console.log(JSON.parse('{"a":1,"b":[1,2]}').b[1]);
console.log(JSON.parse("[1,2,3]").length, JSON.parse("  7  "), JSON.parse("true"), JSON.parse("null"));
console.log(JSON.parse('{"n":{"m":2}}').n.m, JSON.parse('"s"'));
