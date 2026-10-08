// xl:title 经典 for：多初始化、多更新、空条件
// xl:judge stdout
// xl:end

let sum = 0;
for (let i = 0, j = 10; i < j; i++, j--) sum += i;
console.log(sum);
let k = 0;
for (;;) { if (++k > 3) break; }
console.log(k);
for (let i = 5; i > 0; i--) sum -= i;
console.log(sum);
