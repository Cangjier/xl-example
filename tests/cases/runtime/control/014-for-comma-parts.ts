// xl:title for 头部里的逗号运算符（初始化与步进各两个）
// xl:judge stdout
// xl:end

for (let i = 0, j = 5; i < j; i++, j--) console.log(i, j);
let a = 0, b = 0;
for (a = 1, b = 2; a < 4; a += 1, b += 10) console.log(a, b);
