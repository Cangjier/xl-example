// xl:title replaceAll：普通串、空串、与 replace 的差别
// xl:round 371
// xl:judge stdout
// xl:end
console.log("a-b-c".replaceAll("-", "+"));
console.log("aaa".replace("a", "b"), "aaa".replaceAll("a", "b"));
console.log("abc".replaceAll("", "-"));
console.log("x".replaceAll("x", "$&$&"));
