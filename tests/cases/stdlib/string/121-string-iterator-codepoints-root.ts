// xl:title 字符串迭代：按码点走、展开成数组、Array.from 同结果
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log([...s].length, [...s].join("|"), JSON.stringify([...s].map((c) => c.length)));
console.log(Array.from(s).length, [...s][1].codePointAt(0));
