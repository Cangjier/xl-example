// xl:title 带标签的块：label 挂在块上，break label 跳出块继续往下
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
blk: {
  log.push("in");
  if (log.length === 1) break blk;
  log.push("unreachable");
}
log.push("after");
console.log(log.join("|"));
