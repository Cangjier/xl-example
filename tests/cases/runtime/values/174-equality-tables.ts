// xl:title 相等三张表的差别：== / === / Object.is / SameValueZero
// xl:round 371
// xl:judge stdout
// xl:end
const pairs: [unknown, unknown][] = [[null, undefined], [0, ""], ["0", false], [NaN, NaN], [0, -0], [1, "1"], [[], ""], [[1], 1], [{}, "[object Object]"]];
for (const [a, b] of pairs) console.log(String(a == (b as any)), String(a === (b as any)), Object.is(a, b));
console.log([NaN].includes(NaN), [0].includes(-0), [NaN].indexOf(NaN));
