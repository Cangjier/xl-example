// xl:title for..of 头部解构：Map 的键值对 / 数组的元组
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const [i, v] of [[0, "x"], [1, "y"]]) console.log(i, v);
const pairs: Array<[string, number]> = [["p", 1]];
for (const [k, v] of pairs) console.log(k, v);
