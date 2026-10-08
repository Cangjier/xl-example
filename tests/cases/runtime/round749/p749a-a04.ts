// xl:title `for…of` 与解构：数组模式、嵌套模式、默认值
// xl:round 749
// xl:judge stdout
// xl:end
for (const [k, v] of [["a", 1], ["b", 2]] as any) console.log(k, v);
for (const { x, y = 9 } of [{ x: 1 }, { x: 2, y: 3 }] as any) console.log(x, y);
const pairs: Array<[number, number]> = [[1, 2], [3, 4]];
for (const [p, q] of pairs) console.log(p + q);
const [[m, n], [o]] = [[1, 2], [3]] as any;
console.log(m, n, o);
for (const [, second] of [[1, 2], [3, 4]]) console.log(second);
