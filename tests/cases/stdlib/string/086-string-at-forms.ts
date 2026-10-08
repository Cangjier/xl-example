// xl:title String.prototype.at：负数 / 越界 / 与 charAt 的分工
// xl:round 371
// xl:judge stdout
// xl:end
const s = "hello";
console.log(s.at(0), s.at(-1), s.at(-5), s.at(5), s.at(-6));
console.log(s.charAt(0), s.charAt(-1), s.charAt(5), JSON.stringify(s.charAt(5)));
console.log(s.at(1.5), s.charAt(1.9));
