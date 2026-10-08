// xl:title 整数键 / 负号 / 小数的排序待遇
// xl:round 692
// xl:judge stdout
// xl:end

const o = { "-1": 1, "1.5": 2, "01": 3, "0": 4 };
console.log(Object.keys(o).join(","));
