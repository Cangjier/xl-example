// xl:title `try` 在循环里、在函数里、套着 `finally`
// xl:round 331
// xl:judge stdout
// xl:end

function risky(n: number): number {
  try {
    if (n % 2 === 1) throw new Error("odd " + n);
    return n * 2;
  } catch (e) {
    return -1;
  } finally {
    // 只是观察：不改返回值
  }
}
const out: number[] = [];
for (const n of [1, 2, 3, 4]) out.push(risky(n));
console.log(out.join(","));
try {
  for (const n of [1, 2]) {
    if (n === 2) throw new Error("stop");
    out.push(n);
  }
} catch (e) {
  console.log("caught", (e as Error).message);
}
console.log(out.length);
