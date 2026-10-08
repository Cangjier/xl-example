// xl:title 空语句：`if (x) ;` / `for (...) ;` / `while (false) ;`
// xl:round 742
// xl:judge stdout
// xl:end
let n = 0;
if (true) ; else n = 1;
for (let i = 0; i < 2; i++) ;
while (false) ;
console.log(n);
