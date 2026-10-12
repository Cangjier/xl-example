// xl:title 端到端：try 里 return 与 finally 的覆盖顺序 + 嵌套 try
// xl:round 639
// xl:judge stdout
// xl:end

const log: string[] = [];
function inner(): number {
  try {
    log.push("inner-try");
    return 1;
  } finally {
    log.push("inner-finally");
  }
}
function outer(): number {
  try {
    const v = inner();
    log.push("outer-after " + v);
    return v + 10;
  } finally {
    log.push("outer-finally");
    return 99;
  }
}
console.log(outer());
console.log(log.join(","));
