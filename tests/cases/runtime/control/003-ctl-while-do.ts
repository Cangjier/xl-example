// xl:title while / do-while：至少跑一次那一条
// xl:judge stdout
// xl:end

let n = 0;
while (n < 3) n++;
console.log(n);
let m = 10;
do { m++; } while (m < 3);
console.log(m);
let c = 0;
while (true) { if (c === 2) break; c++; }
console.log(c);
