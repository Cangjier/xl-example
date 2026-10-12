// xl:title `for..of` 迭代中改数组长度：现读而不是快照
// xl:round 737
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p737b-b04`；正文一字未动）。
// 判定点只有一个：**数组迭代器每步现读 `length` 与当前下标**——
// 迭代中 `push` 进来的会被看到、`length` 拉长后的空洞交出 `undefined`、
// 迭代中 `splice` 删掉已经走过的元素不会把下标回退。
const a = [1, 2, 3];
const seen: number[] = [];
for (const v of a) { seen.push(v); if (v === 1) a.push(4); if (v === 2) a.length = 5; }
console.log(seen.join(","), a.length);
const b = [1, 2, 3];
const seen2: number[] = [];
for (const v of b) { seen2.push(v); if (v === 1) b.splice(0, 1); }
console.log(seen2.join(","), b.join(","));
