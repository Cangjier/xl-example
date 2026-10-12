// 语料 12：**内建的失败是脚本接得住的异常**（第 121 轮）。
//
// `Object.keys(null)` 在 JS 里抛 `TypeError`、在本仓抛 `Error`——**两边都抛** ✓，
// 所以这一份只打印「接住了没有」，**不打印消息文本** ✗：
// 两边的措辞**本来就不一样**（我们的话是这一层自己写的），拿它比会把差异当成缺口。

function probe(): string {
  try {
    Object.keys(null);
    return "no-throw";
  } catch (error) {
    return "caught:" + typeof error;
  }
}

console.log("keys-null", probe());
console.log("after", 1 + 1);

// **接住之后继续跑**（帧栈没坏）：同一个失败连来三次，三次都要接住。
let caught = 0;
for (let i = 0; i < 3; i++) {
  try {
    Object.keys(null);
  } catch (error) {
    caught += 1;
  }
}
console.log("repeat", caught);

// 嵌套：内层失败被**外层**接住（展开要跨帧）。
function outer(): string {
  try {
    return inner();
  } catch (error) {
    return "outer-caught";
  }
}
function inner(): string {
  Object.keys(null);
  return "inner-returned";
}
console.log("nested", outer());
