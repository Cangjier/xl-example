// 第 189 轮：**`.` 后面的关键字是成员名**（`p.catch(cb)` / `p.finally(cb)`）。
//
// 第 187 / 188 轮量到两条**静默**的形状：`.catch(cb).then(cb2)` 与 `.finally(cb).then(cb2)`
// 一句都不跑、也不报错。这一轮查清了根因：**token 层**那一格。
//
// `MethodReorganization` 决定「名字 + `(`」能不能收成一次调用时，最后一句问的是
// `MethodNameTemplate.IsMethodName(名字)`——而那张表**是给语句位准备的**：它要挡的是
// `if (x)` / `catch (e)` 这类控制结构。`catch` / `finally` 这些字**既是关键字、
// 又是合法属性名**，于是成员位上的调用**被挡掉了**：
// 那对括号谁也不认 → 属性访问链在 `.catch` 处**收尾** → 投影出来的语句只剩
// `Promise.resolve(1).catch` 一个 `PropertyAccessExpression`，**整段 `.catch(cb).then(cb2)`
// 从产物里消失**（实测），运行期于是**一句话都不跑、也不报错**。
//
// 修法：**`.`（或 `?.`）后面的名字永远是成员名**——控制关键字那张表不该管这里。
// 一处修好，两轮量到的两条链式形状一起关掉。

// ① `.catch(cb).then(cb2)`：接住之后下一步照跑（这一轮修的就是它）
Promise.reject("x")
  .catch((e: any) => "caught " + e)
  .then((v: any) => console.log("first", v));

// ② 兑现源上的 `.catch` 也一样（那个 `catch` 的回调不跑，但链要接着走）
Promise.resolve(1)
  .catch((e: any) => "no " + e)
  .then((v: any) => console.log("second", v));

// ③ `?.` 那一支同样放行（`p?.catch(cb)`）
const maybe: any = Promise.resolve("m");
maybe?.catch((e: any) => e)?.then((v: any) => console.log("third", v));

// ④ `.finally` 也在链上活过来了。**次序另外说** ✗：`.finally` 在 JS 规范里
// 多走一 tick（它要等回调的返回值），所以「`.finally` 与另一条链谁先」这一格
// 与本仓**可能不同**——这一条**不钉次序**，只钉「四句都跑了」。
const seen: string[] = [];
const viaFinally = Promise.resolve("fin")
  .finally(() => { seen.push("cleanup"); })
  .then((v: any) => { seen.push("after " + v); return v; });
const viaCatch = Promise.resolve("other")
  .catch((e: any) => e)
  .then((v: any) => { seen.push("catch-chain " + v); return v; });
// 报告那一步挂在**两条链都走完**之后（`Promise.all`，第 186 轮做的）——
// 这样「谁先」就不进这份语料（上面那条说明里写了为什么）。
Promise.all([viaFinally, viaCatch]).then(() => {
  console.log("seen", seen.sort().join(","));
});

console.log("done");
