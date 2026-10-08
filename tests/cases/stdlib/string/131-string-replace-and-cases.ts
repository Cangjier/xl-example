// xl:title String：replace 首处 / replaceAll / 大小写 / 包含与位置
// xl:round 9
// xl:judge stdout
// xl:end

console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("AbC".toUpperCase(), "AbC".toLowerCase());
console.log("hello".includes("ell"), "hello".startsWith("he"), "hello".endsWith("lo"));
console.log("hello".indexOf("l"), "hello".lastIndexOf("l"), "hello".indexOf("z"));
