// xl:title `Array.from` 对数组式对象与洞的填法
// xl:round 305
// xl:judge stdout
// xl:end

console.log(Array.from({ length: 3 }, (_, i) => i * 2).join(","));
console.log(Array.from({ 0: "a", 2: "c", length: 3 }).join(","));
