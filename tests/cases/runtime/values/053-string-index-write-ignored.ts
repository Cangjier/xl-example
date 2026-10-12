// xl:title 给字符串下标赋值：静默无效（松散模式）
// xl:judge stdout
// xl:end

const s = "abc";
(s as any)[0] = "z";
console.log(s, s[0], s.length);
const boxed = new String("xy");
(boxed as any)[0] = "q";
console.log(boxed.toString());
