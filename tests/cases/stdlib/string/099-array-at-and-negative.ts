// xl:title Array.prototype.at：负下标与越界
// xl:round 371
// xl:judge stdout
// xl:end
const xs = [1, 2, 3];
console.log(xs.at(0), xs.at(-1), xs.at(-3), xs.at(3), xs.at(-4));
console.log([].at(0));
console.log(xs.at(-0), xs.at(1.9));
