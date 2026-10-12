// 第 201 轮：**带 `finally` 的 `try` 里 `return` / `break` / `continue`**。
//
// 普查里 `finally-return` 那一条（也是 `BLOCKED` 那一栏的**第一条**）：
// `function f() { try { return 1; } finally { console.log("fin"); } }` 报
// `unimplemented: return inside a try with finally (it would skip the finally)`
// ——**整份文件进不来**。
//
// 那一抛本身是**对的**：静默跳过 `finally` 是**静默错值**，本仓宁可报出来。
// 但 `try { … } finally { … }` 里 `return` 在普通 `.ts` 里**遍地都是**（清理、解锁、收尾），
// 所以这一轮把那段改写补上了：**先把在册的 `finally` 从里到外各发一遍，再走**。
//
// 三样 abrupt completion 走**同一个方法**（`EmitPendingFinalies`）：
// `return` / `break` / `continue`——`throw` 不必它管（异常本来就走「重抛」那张网）。
//
// **一条容易漏的规矩**：`return` 的**值要先算出来**（在跑 `finally` 之前）——
// `let n = 0; try { n = 1; return n; } finally { n = 2; }` 在 JS 里给 `1`。

// ① 最基本的那一条
function first(): number {
  try {
    return 1;
  } finally {
    console.log("fin-1");
  }
}
console.log(first());

// ② `finally` 自己 `return` 会**接管**（`try` 里的返回值被丢掉）
function override(): number {
  try {
    return 1;
  } finally {
    return 2;
  }
}
console.log(override());

// ③ `catch` 里 `return` 也要跑 `finally`
function caught(): string {
  try {
    throw new Error("boom");
  } catch (error) {
    return "caught:" + (error as Error).message;
  } finally {
    console.log("fin-3");
  }
}
console.log(caught());

// ④ 嵌套：**从里到外**跑（A 再 B），最后才返回
function nested(): string {
  try {
    try {
      return "inner";
    } finally {
      console.log("A");
    }
  } finally {
    console.log("B");
  }
}
console.log(nested());

// ⑤ **返回值要在跑 `finally` 之前算出来**
function snapshot(): number {
  let n = 0;
  try {
    n = 1;
    return n;
  } finally {
    n = 2;
    console.log("in-finally", n);
  }
}
console.log(snapshot());

// ⑥ 循环里的 `continue` / `break`（带 `finally`）——注意 `for` 的更新式也要跑
function loopFlow(): string {
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    try {
      if (i === 1) continue;
      if (i === 2) break;
      seen.push("body-" + i);
    } finally {
      seen.push("fin-" + i);
    }
  }
  return seen.join(",");
}
console.log(loopFlow());

// ⑦ `for..of` 里的 `break`（迭代器那一层与 `finally` 那一层叠在一起）
function forOfFlow(): number {
  let total = 0;
  for (const x of [1, 2, 3, 4]) {
    try {
      if (x === 3) break;
      total += x;
    } finally {
      console.log("of-fin", x);
    }
  }
  return total;
}
console.log(forOfFlow());

// ⑧ 裸 `return`（没有表达式）与「正常走完」两条路
function bare(): string {
  try {
    return "early";
  } finally {
    console.log("fin-8a");
  }
}
function plain(): string {
  try {
    console.log("fin-8b");
  } finally {
    console.log("fin-8c");
  }
  return "late";
}
console.log(bare(), plain());

// ⑨ 异常没被接住时 `finally` 照跑（回归：那一条早就通了）
function rethrow(): void {
  try {
    try {
      throw new Error("inner");
    } finally {
      console.log("fin-9");
    }
  } catch (error) {
    console.log("caught-9:" + (error as Error).message);
  }
}
rethrow();
