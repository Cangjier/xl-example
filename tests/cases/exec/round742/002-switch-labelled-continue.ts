// xl:title `switch` 里的 `continue` 指向**带标签的外层循环**
// xl:round 742
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p742b-b01`；正文一字未动）。
// 判定点只有一个：**`switch` 不接 `continue` 的靶**——`continue outer` 从 `case` 里
// 直接落到外层那个带标签的循环（`switch` 自己的收尾与 `tail` 都不跑）。
outer: for (let i = 0; i < 3; i++) {
  switch (i) {
    case 1: continue outer;
    default: console.log("body" + i);
  }
  console.log("tail" + i);
}
