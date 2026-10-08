// xl:title const enum 的使用
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Dir { Up = 1, Down }
const d: Dir = Dir.Up;
console.log(d, d === 1, Dir.Down);
