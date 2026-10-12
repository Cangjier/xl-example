// xl:title 带标签的语句：break 跳出外层循环、continue 跳到外层下一轮
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 2) continue outer;
    if (i === 2) break outer;
    log.push(i + "" + j);
  }
}
console.log(log.join(","));
