// xl:title Object(原始值) 的包装对象
// xl:round 291
// xl:judge stdout
// xl:end

const n = Object(1);
const s = Object("a");
const b = Object(true);
console.log(typeof n, typeof s, typeof b, n.valueOf(), s.valueOf(), b.valueOf());
