// xl:title Object.keys / values / entries 落在字符串与数字上
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Object.keys("abc").join(","));
console.log(JSON.stringify(Object.values("abc")));
console.log(JSON.stringify(Object.entries("ab")));
console.log(Object.keys(5).length, Object.keys(true).length, Object.keys("").length);
