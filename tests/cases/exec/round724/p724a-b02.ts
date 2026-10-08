// xl:title 稀疏数组的复制族：洞要变成 undefined（第 724 轮新登记的缺口）
// xl:round 724
// xl:judge stdout
// xl:want differ
// xl:why **复制族把洞留着、JS 把它变成 `undefined`**：`[1, , 3].toSorted()` 在 Node 里
// xl:why `1 in` 为**真**（`SortIndexedProperties` 逐格读，读到的 `undefined` 会真写进去），
// xl:why 本仓为假（洞跟着搬）。`toReversed` / `with` / `toSpliced` 同一条路。
// xl:why **`slice` / `concat` 是另一条口径**（JS 里它们**保留**洞，`1 in` 为假）——
// xl:why 那两条在本仓是对的，用例把它们一起钉住，免得日后「顺手改齐」。
// xl:end
const a: any[] = [1, , 3];
console.log(JSON.stringify(a.toSorted()), JSON.stringify(a.slice()), JSON.stringify([...a]));
console.log(1 in a.toSorted(), 1 in a.slice(), 1 in a.concat([]));
const b = a.toReversed();
console.log(JSON.stringify(b), 1 in b);
console.log(JSON.stringify(a.with(1, 5)), 1 in a.with(1, 5));
