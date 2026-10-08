// xl:title String.includes 的 fromIndex 参数
// xl:judge stdout
// xl:end

const s = "banana";
console.log(s.includes("nan", 3), s.includes("nan", 2), s.includes("nan", 4));
console.log(s.includes("ban", -3), s.includes("ana", 99));
