// xl:title 字符串方法收到小数 / 负数 / NaN 实参时的取值口径
// xl:round 371
// xl:judge stdout
// xl:end
const s = "abcdefgh";
console.log(s.slice(1.5, 3.9), s.substring(1.5, 3.9), s.substr(1.5, 3.9));
console.log(s.indexOf("c", 1.5), s.lastIndexOf("c", 3.9));
console.log(JSON.stringify(s.split("", 2.9)));
console.log("x".repeat(3.9), "x".padStart(5.9, "0"));
console.log(s.charAt(1.5), s.charCodeAt(1.5), s.at(1.5));
