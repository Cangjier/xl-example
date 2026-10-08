// xl:title 嵌套 try/finally 的收尾次序（含内层抛、外层接住）
// xl:round 304
// xl:judge stdout
// xl:end

const log: string[] = [];
try {
  try {
    log.push("inner-throw");
    throw new Error("x");
  } finally {
    log.push("inner-finally");
  }
} catch (e) {
  log.push("outer-catch");
} finally {
  log.push("outer-finally");
}
console.log(log.join(">"));
