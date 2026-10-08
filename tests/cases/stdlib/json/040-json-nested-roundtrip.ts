// xl:title JSON 往返：嵌套结构、特殊数字、空容器
// xl:round 371
// xl:judge stdout
// xl:end
const data = { a: [1, { b: [2, 3] }], c: { d: null }, e: [], f: {}, g: "s" };
const text = JSON.stringify(data);
console.log(text);
console.log(JSON.stringify(JSON.parse(text)) === text);
console.log(JSON.stringify([{}, [], null, 0, ""]), JSON.stringify({ a: 0, b: "" }));
