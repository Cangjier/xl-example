// xl:title 值模型：+ 的字符串优先、关系比较走数值、== 的转换表
// xl:round 7
// xl:judge stdout
// xl:end

console.log(1 + "2", "3" * "2", [] + {}, [] + [], [1] + 1, null + 1, undefined + 1);
console.log("10" < "9", "10" < 9, null == undefined, null === undefined, "" == 0, [] == false);
