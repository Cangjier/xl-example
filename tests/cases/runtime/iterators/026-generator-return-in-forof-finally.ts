// xl:title for..of 里 return 提前退出：finally 照跑、迭代器被关闭
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
function* gen() {
  try {
    yield 1;
    yield 2;
  } finally {
    log.push("closed");
  }
}
function take() {
  for (const v of gen()) {
    log.push("v" + v);
    if (v === 1) return "early";
  }
  return "full";
}
console.log(take(), log.join(","));
