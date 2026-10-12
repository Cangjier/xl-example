// xl:title 快排 / 归并 / 插入排序三种实现与稳定性对比
// xl:round 371
// xl:judge stdout
// xl:end
function quick(xs: number[]): number[] {
  if (xs.length <= 1) return xs.slice();
  const pivot = xs[0];
  const less: number[] = [];
  const same: number[] = [];
  const more: number[] = [];
  for (const v of xs) {
    if (v < pivot) less.push(v);
    else if (v > pivot) more.push(v);
    else same.push(v);
  }
  return quick(less).concat(same, quick(more));
}
function merge(xs: number[]): number[] {
  if (xs.length <= 1) return xs.slice();
  const mid = Math.floor(xs.length / 2);
  const left = merge(xs.slice(0, mid));
  const right = merge(xs.slice(mid));
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}
function insertion(xs: number[]): number[] {
  const out = xs.slice();
  for (let i = 1; i < out.length; i++) {
    const v = out[i];
    let j = i - 1;
    while (j >= 0 && out[j] > v) { out[j + 1] = out[j]; j -= 1; }
    out[j + 1] = v;
  }
  return out;
}
const data = [5, 2, 9, 1, 5, 6, -3, 0];
console.log(quick(data).join(","));
console.log(merge(data).join(","));
console.log(insertion(data).join(","), data.join(","));
type Row = { k: number; tag: string };
function stableMerge(rows: Row[]): Row[] {
  if (rows.length <= 1) return rows.slice();
  const mid = Math.floor(rows.length / 2);
  const left = stableMerge(rows.slice(0, mid));
  const right = stableMerge(rows.slice(mid));
  const out: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) out.push(left[i].k <= right[j].k ? left[i++] : right[j++]);
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}
console.log(stableMerge([{ k: 1, tag: "a" }, { k: 0, tag: "b" }, { k: 1, tag: "c" }]).map((r) => r.tag).join(""));
