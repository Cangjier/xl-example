// xl:title 深层解构：对象里套数组、数组里套对象、默认值
// xl:judge stdout
// xl:end

const data: any = { user: { name: "kim", tags: ["x", "y"] }, counts: [[1, 2], [3]] };
const { user: { name, tags: [first, ...restTags] }, counts: [[a, b], [c]] } = data;
console.log(name, first, restTags.join(""), a + b + c);
const { missing: { deep = "dflt" } = {} } = data;
console.log(deep);
const [x = 1, y = 2, z = 3] = [undefined, 9];
console.log(x, y, z);
