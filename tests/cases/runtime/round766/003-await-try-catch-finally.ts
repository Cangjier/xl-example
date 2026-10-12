// xl:title `async` 函数里 `await` 之后的 `try` / `catch` / `finally`
// xl:round 766
// xl:judge stdout
// xl:note 上面那两条钉的是**生成器**那条路（帧被 `yield` 摘下去再挂回来）；
// xl:note 这一条钉 `await` 那条路——**同一个形状的另一种摘帧**：
// xl:note 帧被 `await` 摘下去时它的处理点也留在这一摞里，而调用者在它挂起之后
// xl:note 可能又进了新的 `try`。第 766 轮那条改法（按帧的层深挑处理点）把两条路一起管住了。
// xl:note 三档一起量：`await` 之后自己抛、`await` 一个被拒绝的承诺、
// xl:note 以及**两层 `await` 之后**才抛（中间夹着别的 `try`）。
// xl:end
async function selfThrow(): Promise<void> {
  try {
    await Promise.resolve(1);
    throw new Error("boom");
  } catch (e) {
    console.log("01 caught", (e as Error).message);
  } finally {
    console.log("02 fin");
  }
}
async function rejected(): Promise<void> {
  try {
    await Promise.reject(new Error("rejected"));
  } catch (e) {
    console.log("03 caught", (e as Error).message);
  } finally {
    console.log("04 fin");
  }
}
async function nested(): Promise<void> {
  try {
    try {
      await Promise.resolve(1);
      await Promise.resolve(2);
      throw new Error("deep");
    } finally {
      console.log("05 fin-inner");
    }
  } catch (e) {
    console.log("06 caught", (e as Error).message);
  }
}
selfThrow();
rejected();
nested();
Promise.resolve().then(() => console.log("07 after"));
