// xl:title Object.create 带第二格属性描述表
// xl:judge stdout
// xl:end

const proto = { greet: () => "hi" };
const o = Object.create(proto, { a: { value: 1, enumerable: true } });
console.log(o.greet(), o.a, Object.keys(o).join(","));
