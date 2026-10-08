// xl:title for..of 里直接解构 entries 与数组的数组
// xl:round 304
// xl:judge stdout
// xl:end

const pairs: Array<[string, number]> = [["a", 1], ["b", 2]];
for (const [k, v] of pairs) console.log(k, v * 2);
for (const [i, x] of ["p", "q"].entries()) console.log(i, x);
