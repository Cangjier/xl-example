// xl:title Array.at 的负数下标与边界；字符串也有一份
// xl:round 323
// xl:judge stdout
// xl:end

const xs = [10, 20, 30];
console.log(xs.at(0), xs.at(-1), xs.at(3), xs.at(-4));
console.log("abc".at(-1), "abc".at(5));
