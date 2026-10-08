// xl:title 带标签的块：break 标签直接跳出整块
// xl:judge stdout
// xl:end

let hits = 0;
block: {
  hits += 1;
  if (hits === 1) break block;
  hits += 100;
}
console.log(hits);
