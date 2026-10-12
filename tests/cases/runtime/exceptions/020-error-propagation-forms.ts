// xl:title 错误的包装与 `cause` 的传播（含显式传与非 Error 的 cause）
// xl:round 291
// xl:judge stdout
// xl:end
// **第 794 轮把 026 并了进来**（同一个判据的另一种写法：`cause?.message`）。
// 判定点只有一个：**包一层之后 `cause` 上挂着的是原来那个对象，message 接得上**。
function inner() { throw new RangeError("deep"); }
function outer() { try { inner(); } catch (e) { throw new Error("wrapped", { cause: e }); } }
try { outer(); } catch (e: any) { console.log(e.message, e.cause.message); }
function inner2(): never {
  throw new Error("root");
}
function outer2(): never {
  try {
    inner2();
  } catch (e) {
    throw new Error("wrap", { cause: e });
  }
}
try {
  outer2();
} catch (e) {
  const err = e as Error & { cause?: Error };
  console.log(err.message, err.cause?.message);
}
