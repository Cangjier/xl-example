// xl:title 真假只有一个定义：空串是假、空数组是真
// xl:judge stdout
// xl:end

const values = [0, 1, -1, 0.5, "", "0", "false", null, undefined, NaN, true, false];
for (const v of values) { console.log(typeof v, !!v); }
console.log([].length === 0, !![], !![1], !!{});
