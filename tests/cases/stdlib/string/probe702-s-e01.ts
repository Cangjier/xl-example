// xl:title 字符串方法的实参过 ToNumber：布尔 / null / 数字串 / 包装对象
// xl:round 702
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".slice("1")));
console.log(show("abc".charAt(null)));
console.log(show("abc".charAt(true)));
console.log(show("abc".indexOf("c", "2")));
console.log(show("ab".padStart({ valueOf: () => 4 }, { toString: () => "0" })));
