// xl:title const enum 在模块内的用法（与普通 enum 同形）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Dir { Up, Down }
function move(d: Dir) { return d === Dir.Up ? "up" : "down"; }
console.log(Dir.Up, Dir.Down, move(Dir.Up), Dir[0]);
