// xl:title Array.prototype.at：正负下标与越界
// xl:round 9
// xl:judge stdout
// xl:end

const a = [1, 2, 3];
console.log(a.at(0), a.at(-1), a.at(2), a.at(3), a.at(-4));
console.log("abc".at(-1), "abc".at(1));
