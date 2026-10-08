// xl:title slice / substring / at 在负下标与越界上的三种口径
// xl:judge stdout
// xl:end

const s = "abcdef";
console.log(s.slice(-2), s.slice(1, -1), s.slice(9), s.slice(4, 1));
console.log(s.substring(4, 1), s.substring(-2, 2));
console.log(s.at(-1), s.at(0), s.at(99), s.at(-99));
