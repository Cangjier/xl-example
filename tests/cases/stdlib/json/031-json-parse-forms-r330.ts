// xl:title `JSON.parse` 的空白、指数与嵌套
// xl:round 330
// xl:judge stdout
// xl:end

console.log(JSON.parse('  { "a" : [ 1 , 2 ] }  ').a.join(","));
console.log(JSON.parse("1e3"), JSON.parse("-0.5"), JSON.parse("true"));
console.log(JSON.parse('{"n":{"m":[{"x":1}]}}').n.m[0].x);
