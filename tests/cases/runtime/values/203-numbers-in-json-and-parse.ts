// xl:title 数字在 JSON 与 parse 上的精度与形态
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify([1, 1.5, -0, 1e21, 1e-7]));
console.log(JSON.parse("[1,1.5,1e21,1e-7]").join(","));
console.log(JSON.parse("1e400"), JSON.parse("-1e400"));
console.log(JSON.stringify(0.1 + 0.2), JSON.parse(String(0.1 + 0.2)));
console.log(JSON.parse("9007199254740993"), 9007199254740993);
