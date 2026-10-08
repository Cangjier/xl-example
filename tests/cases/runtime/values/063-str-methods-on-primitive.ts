// xl:title 原始值上直接调方法：每次读都拿到一个新的包装
// xl:judge stdout
// xl:end

const s = "Hello World";
console.log(s.toUpperCase(), s.slice(0, 5), s.indexOf("o"), s.split(" ").length);
const n = 1234.5678;
console.log(n.toFixed(2), n.toString().length);
const b = true;
console.log(b.toString(), b.valueOf());
