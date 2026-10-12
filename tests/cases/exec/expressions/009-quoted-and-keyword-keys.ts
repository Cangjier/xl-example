// xl:title 字符串键 / 关键字键 / 数字键的成员名
// xl:judge stdout
// xl:end

const o: any = { "a-b": 1, if: 2, 3: "three", class: 4, default: 5 };
console.log(o["a-b"], o.if, o[3], o.class, o.default);
console.log(Object.keys(o).join(","));
