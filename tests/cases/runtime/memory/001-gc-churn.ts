// xl:title 大量短命分配：回收器要跟得上（不 OOM）
// xl:judge stdout
// xl:end

let total = 0;
for (let i = 0; i < 10000; i++) {
  const xs = [i, i + 1, i + 2];
  total += xs[0] + xs[2];
}
console.log(total);
