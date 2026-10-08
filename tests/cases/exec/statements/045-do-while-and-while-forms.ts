// xl:title do…while 至少执行一次；while 与 for(;;) 等价
// xl:round 9
// xl:judge stdout
// xl:end

let n = 0;
do { n += 1; } while (n < 0);
console.log("do", n);
let m = 0;
while (m < 3) m += 1;
console.log("while", m);
let k = 0;
for (;;) { k += 1; if (k === 2) break; }
console.log("for", k);
