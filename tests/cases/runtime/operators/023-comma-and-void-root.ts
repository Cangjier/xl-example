// xl:title 逗号运算符与 void：只留最后一个 / 一律 undefined
// xl:judge stdout
// xl:end

let n = 0;
const v = (n += 1, n += 2, n);
console.log(v, n);
console.log(void (n += 10), n);
