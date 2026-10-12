// xl:title 端到端：sort 稳定性 + 稀疏数组 + at 负下标
// xl:round 639
// xl:judge stdout
// xl:end

const rows = [
  { k: 2, tag: "a" },
  { k: 1, tag: "b" },
  { k: 2, tag: "c" },
  { k: 1, tag: "d" },
];
rows.sort((x, y) => x.k - y.k);
console.log(rows.map((r) => r.tag).join(""));
const sparse: number[] = [1, , 3];
console.log(sparse.length, 1 in sparse, sparse.join("-"));
console.log(sparse.at(-1), sparse.at(-3), sparse.at(-9));
const filled = sparse.fill(0, 1, 2);
console.log(filled.join("-"));
