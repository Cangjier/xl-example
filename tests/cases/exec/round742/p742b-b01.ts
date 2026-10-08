// xl:title `switch` 里的 `continue` 指向**带标签的外层循环**
// xl:round 742
// xl:judge stdout
// xl:end
outer: for (let i = 0; i < 3; i++) {
  switch (i) {
    case 1: continue outer;
    default: console.log("body" + i);
  }
  console.log("tail" + i);
}
