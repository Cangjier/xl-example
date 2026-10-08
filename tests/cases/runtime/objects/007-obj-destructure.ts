// xl:title 对象解构：改名、默认值、剩余、嵌套
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2, c: { d: 3 } };
const { a, b: renamed, z = 9, ...rest } = o;
console.log(a, renamed, z, Object.keys(rest).join(","));
const { c: { d } } = o;
console.log(d);
