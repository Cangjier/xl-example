// xl:title 循环里 try/finally 夹着 continue：finally 照跑
// xl:judge stdout
// xl:end

const out: number[] = [];
for (let i = 0; i < 5; i++) {
  try {
    if (i % 2) continue;
    out.push(i);
  } finally {
    out.push(100 + i);
  }
}
console.log(out.join(","));
