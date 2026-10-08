// xl:title JSON 往返：嵌套结构、特殊字符、数字形状
// xl:judge stdout
// xl:end

const value = { a: [1, { b: "x\ny" }, null], c: true, d: 1.5, e: -0 };
const text = JSON.stringify(value);
const back: any = JSON.parse(text);
console.log(text);
console.log(back.a[1].b === "x\ny", back.e === 0, 1 / back.e === -Infinity, Array.isArray(back.a));
