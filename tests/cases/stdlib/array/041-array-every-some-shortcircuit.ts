// xl:title every / some 的短路：回调次数就是判据
// xl:round 291
// xl:judge stdout
// xl:end

let n = 0;
const xs = [1, 2, 3];
console.log(xs.every((v) => { n++; return v < 3; }), n);
n = 0;
console.log(xs.some((v) => { n++; return v > 1; }), n);
