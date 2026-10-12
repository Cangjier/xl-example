// xl:title `typeof` 一个没声明过的名字给 "undefined"（不抛）
// xl:judge stdout
// xl:end

console.log(typeof nothingHere, typeof globalThis);
console.log(typeof console, typeof Math, typeof JSON);
