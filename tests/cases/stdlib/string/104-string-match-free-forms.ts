// xl:title 不含正则的字符串查找：search 之外的手段
// xl:round 371
// xl:judge stdout
// xl:end
const text = "alpha beta gamma";
console.log(text.split(" ").indexOf("beta"), text.indexOf("beta") > 0);
console.log(text.split(" ").filter((w) => w.includes("a")).join(","));
console.log(text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
console.log(text.split(" ").some((w) => w.startsWith("g")), text.split(" ").find((w) => w.length > 4));
