// 语料 19：**rt 层的失败也是脚本接得住的异常**（第 127 轮）——与 `node` 逐字节对拍。
//
// 第 121 轮铺的是「**宿主函数**失败 → 脚本异常」那条路 ✓（`JSON.parse` 靠它 ✓）；
// 第 127 轮把 **rt 层**（引擎自己的 `rt_call` 那几条）也接上了 ✓——
// `str + obj`、`for..of` 撞上不可迭代的东西 ✓，以前都是**从 `Run()` 直接冒出来** ✗，
// 于是 `try/catch` 形同虚设 ✗。
//
// **这一份只打印「接住了没有 / 拿到的是什么形状」** ✗ 不打印消息文本：
// 两边的措辞本来就不一样（Node 说 "42 is not iterable"，我们说的是这一层自己的话 ✓）。

function attempt(): string {
  try {
    for (const item of 42) {
      return "iterated";
    }
    return "no-throw";
  } catch (error) {
    return "caught:" + typeof error;
  }
}

console.log("of-number", attempt());
console.log("after", 1 + 1);

// 接住之后**还能接着用**（帧栈没被打坏）：连来三次都接住。
let caught = 0;
for (let i = 0; i < 3; i++) {
  try {
    for (const item of 42) {
      caught += 100;
    }
  } catch (error) {
    caught += 1;
  }
}
console.log("repeat", caught);
