// xl:title 访问器每次读都算一次（不是缓存）
// xl:judge stdout
// xl:end

let n = 0;
const o = { get v() { n++; return n; }, plain: 0 };
console.log(o.v, o.v, o.v, n);
o.plain = 5;
console.log(o.plain, n);
