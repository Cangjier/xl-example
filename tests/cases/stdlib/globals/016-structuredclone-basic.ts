// xl:title `structuredClone`：对象与数组是深拷贝
// xl:round 330
// xl:judge stdout
// xl:end

const source = { a: 1, b: { c: [1, 2, 3] } };
const copy = structuredClone(source);
copy.b.c.push(4);
copy.a = 9;
console.log(source.a, source.b.c.length, copy.a, copy.b.c.join(","));
