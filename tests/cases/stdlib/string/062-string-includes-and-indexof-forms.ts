// xl:title includes / indexOf / startsWith 的起始位置
// xl:round 304
// xl:judge stdout
// xl:end

const s = "banana";
console.log(s.includes("na"), s.includes("na", 3), s.indexOf("na"), s.indexOf("na", 3), s.indexOf("zz"));
console.log(s.startsWith("ba"), s.endsWith("na"), s.startsWith("na", 2));
