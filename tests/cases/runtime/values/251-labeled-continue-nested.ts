// xl:title 带标签的 continue 跳到外层循环的下一轮
// xl:round 8
// xl:judge stdout
// xl:end

outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    console.log(i, j);
  }
  console.log("never");
}
