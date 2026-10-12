// xl:title 复合赋值：每一条都只读一次左边
// xl:judge stdout
// xl:end

let n = 10;
n += 5; n -= 3; n *= 2; n /= 4; n %= 4;
console.log(n);
let m = 6;
m &= 3; m |= 8; m ^= 1; m <<= 2; m >>= 1;
console.log(m);
