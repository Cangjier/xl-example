// xl:title 循环里拼字符串：长度与首尾切片
// xl:judge stdout
// xl:end

let out = "";
for (let i = 0; i < 200; i++) out += i % 10;
console.log(out.length, out.slice(0, 10), out.slice(-3), out[199]);
