// xl:title 逗号：从左到右算、值取最后一个
// xl:judge stdout
// xl:end

let a = 0;
const b = (a = 1, a + 1, a + 2);
console.log(a, b);
for (let i = 0, j = 3; i < j; i++, j--) { console.log(i, j); }
