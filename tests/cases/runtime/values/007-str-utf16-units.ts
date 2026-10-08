// xl:title 字符串是码元序列：代理对算两格
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log(s.length, s.charCodeAt(0), s.charCodeAt(1));
console.log("\u0041" === "A", "\u{41}" === "A", "\x41" === "A");
