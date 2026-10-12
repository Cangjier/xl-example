// xl:title 大字符串上的查找 / 切分 / 替换
// xl:round 371
// xl:judge stdout
// xl:end
const text = "abcd".repeat(1000);
console.log(text.length, text.indexOf("z"), text.indexOf("cd"), text.lastIndexOf("cd"));
console.log(text.split("ab").length, text.split("").length, text.slice(0, 4));
console.log(text.replace("abcd", "x").length, text.startsWith("abcd"), text.endsWith("abcd"));
console.log(text.split("abcd").length, text.includes("dcba"), text.length / 4);
console.log(text.substring(0, 2), text.charAt(3), "abcd".repeat(3));
