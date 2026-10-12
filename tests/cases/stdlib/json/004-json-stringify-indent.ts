// xl:title JSON.stringify 的缩进实参（数与字符串两种形态）
// xl:judge stdout
// xl:end

const o = { a: [1, 2] };
console.log(JSON.stringify(o, null, 2));
console.log(JSON.stringify(o, null, 0));
console.log(JSON.stringify(o, null, "\t").length > JSON.stringify(o).length);
