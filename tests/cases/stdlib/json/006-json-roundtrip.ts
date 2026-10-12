// xl:title JSON 往返：序列化再解析回来是同一个值
// xl:judge stdout
// xl:end

const o = { a: 1, b: "x", c: [true, null], d: { e: 2.5 } };
const back = JSON.parse(JSON.stringify(o));
console.log(JSON.stringify(back) === JSON.stringify(o), back.d.e);
