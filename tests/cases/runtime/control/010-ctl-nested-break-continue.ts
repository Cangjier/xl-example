// xl:title 嵌套循环里 break / continue 各回各的层
// xl:judge stdout
// xl:end

let hits = 0;
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue;
    if (i === 2) break;
    hits++;
  }
}
console.log(hits);
