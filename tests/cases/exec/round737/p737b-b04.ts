// xl:title `for..of` 迭代中**改数组长度**（现读 vs 快照）
// xl:round 737
// xl:judge stdout
// xl:end
const a = [1, 2, 3];
const seen: number[] = [];
for (const v of a) { seen.push(v); if (v === 1) a.push(4); if (v === 2) a.length = 5; }
console.log(seen.join(","), a.length);
const b = [1, 2, 3];
const seen2: number[] = [];
for (const v of b) { seen2.push(v); if (v === 1) b.splice(0, 1); }
console.log(seen2.join(","), b.join(","));
