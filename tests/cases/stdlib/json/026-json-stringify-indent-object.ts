// xl:title `JSON.stringify` 的缩进形态在嵌套对象上
// xl:round 305
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, b: { c: [1, 2] } }, null, 2));
