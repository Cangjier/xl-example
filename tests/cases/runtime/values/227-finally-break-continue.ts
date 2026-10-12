// xl:title finally 与 break / continue：循环出口与 finally 的执行顺序
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
for (let i = 0; i < 3; i++) {
  try { if (i === 1) continue; log.push("body" + i); } finally { log.push("fin" + i); }
}
outer: for (let i = 0; i < 3; i++) {
  try { if (i === 2) break outer; log.push("o" + i); } finally { log.push("of" + i); }
}
console.log(log.join("|"));
