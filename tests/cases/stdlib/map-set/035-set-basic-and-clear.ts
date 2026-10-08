// xl:title Set 的去重、delete 与 clear
// xl:round 291
// xl:judge stdout
// xl:end

const s = new Set([1, 2, 2, 3]);
console.log(s.size, s.has(2), s.delete(2), s.size, [...s].join(","));
s.clear();
console.log(s.size, s.has(1));
const t = new Set("aab");
console.log(t.size, [...t].join(""));
