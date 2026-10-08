// xl:title do..while 至少跑一次（条件一开始就是假）
// xl:judge stdout
// xl:end

let n = 0;
do { n += 1; } while (false);
console.log(n);
let m = 10;
do { m -= 3; } while (m > 0);
console.log(m);
