// xl:title JSON.parse 的空白、转义与数字
// xl:round 304
// xl:judge stdout
// xl:end

console.log(JSON.stringify(JSON.parse('  { "a" : 1 , "b" : [ true , null ] }  ')));
console.log(JSON.parse('"a\\nb"').length, JSON.parse("-1.5e2"), JSON.parse("0"));
