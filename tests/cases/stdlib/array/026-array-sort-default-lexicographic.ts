// xl:title sort 不给比较器：按文本、undefined 排尾、返回原数组
// xl:judge stdout
// xl:end

const xs = [10, 9, 100, 1];
const back = xs.sort();
console.log(xs.join(","), back === xs);
const ys: any[] = ["b", undefined, "a", "c"];
console.log(ys.sort().join("|"));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
