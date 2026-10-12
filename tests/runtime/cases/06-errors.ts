// 语料 06：异常（try / catch / finally / throw / 重抛 / catch 里的解构绑定）。
//
// **没写的**：带 `finally` 的 `try` 里 `return` / `break` / `continue`——
// 那要「把 finally 的代码发两遍」，本层明确抛（降级期）。所以这一份里凡是有 `finally`
// 的函数，收尾**一律写在 `try` 之后**（这正是这一层要求的形状）。
// 没有 `finally` 的 `try` 里照常 `return`（`rethrow` / `messageOf` 就是）。

function risky(kind: string): string {
  let result = "no throw";
  try {
    if (kind === "string") throw "a plain string";
    if (kind === "object") throw { message: "boom", code: 7 };
    if (kind === "nested") {
      try {
        throw { message: "inner" };
      } catch (inner) {
        throw { message: "outer:" + inner.message };
      }
    }
  } catch (error) {
    // **抛出来的可以是任何值**：字符串那一档没有 `.message`（JS 里是 `undefined`），
    // 所以这里先按 `typeof` 分档——顺手把「字符串也能抛」这条钉住。
    if (typeof error === "string") {
      result = "caught-string:" + error;
    } else {
      result = "caught:" + error.message;
    }
  } finally {
    console.log("finally", kind);
  }
  return result;
}

console.log("string", risky("string"));
console.log("object", risky("object"));
console.log("nested", risky("nested"));
console.log("clean", risky("clean"));

// catch 的绑定可以是解构模式（引擎与降级层各有一条路）。
function messageOf(thrown: boolean): string {
  try {
    if (thrown) throw { message: "destructured", extra: 1 };
    return "none";
  } catch ({ message }) {
    return message;
  }
}
console.log("catch-destructure", messageOf(true), messageOf(false));

// 重抛：catch 里再抛，外层接得住。
function rethrow(): string {
  try {
    try {
      throw { message: "first" };
    } catch (error) {
      throw { message: "second(" + error.message + ")" };
    }
  } catch (outer) {
    return outer.message;
  }
}
console.log("rethrow", rethrow());

// 循环里的 try/catch：异常不许越出这一次迭代。
let survived: number = 0;
for (let i = 0; i < 5; i++) {
  try {
    if (i % 2 === 1) throw { message: "odd" };
    survived += 1;
  } catch (error) {
    survived += 10;
  }
}
console.log("in-loop", survived);
