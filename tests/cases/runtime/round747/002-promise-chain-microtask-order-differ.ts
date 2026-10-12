// xl:title 承诺链与另一条链的**微任务次序**
// xl:round 747
// xl:judge stdout
// xl:want differ
// xl:why 两条**互不相干**的承诺链并行排着时，本仓让「短的那条」先跑完：
// xl:why ```
// xl:why Promise.resolve(1).then(v => v + 1).then(v => { throw new Error("boom" + v); })
// xl:why   .then(() => "not here").catch(e => "caught:" + e.message).then(v => console.log("chain", v));
// xl:why Promise.resolve(1).then(v => v + 1).finally(() => console.log("fin")).then(v => console.log("after fin", v));
// xl:why ```
// xl:why `node` 给 `sync / caught2 r / fin / chain caught:boom2 / after fin 2`，
// xl:why 本仓给 `sync / caught2 r / fin / after fin 2 / chain caught:boom2`——
// xl:why **后两行的次序反了**。
// xl:why
// xl:why **单独跑每一条链，两边的次序都对**（上面那两条各自量过：
// xl:why `chain caught:boom2` 与 `after fin 2` 的内容一字不差）。差的只是
// xl:why 「两条链同时在飞时，谁先落到队列尾」——也就是**每一次 `then` 恢复
// xl:why 到底让出几个微任务**。规范里 `PromiseReactionJob` 是**一个**任务，
// xl:why 而本仓的 `SettlePromise` / `MakePromise` 那几处（第 285 / 318 轮）
// xl:why 在每一跳上排了几个 —— 数一遍才能说清，而「数一遍」正是收它的第一步。
// xl:why 第 747 轮如实登在这里，**不猜**。
// xl:why
// xl:why **这不是「先后无所谓」**：`await` 的次序是脚本看得见的东西
// xl:why （判据 `c338-e2e-async-queue-and-generators` 量过另一种形态的同一件事）。
// xl:end

Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error("boom" + v); })
  .then(() => "not here")
  .catch((e) => "caught:" + (e as Error).message)
  .then((v) => console.log("chain", v));
Promise.resolve(1).then((v) => v + 1).finally(() => console.log("fin")).then((v) => console.log("after fin", v));
console.log("sync");

(() => {
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error("boom" + v); })
  .then(() => "not here")
  .catch((e) => "caught:" + (e as Error).message)
  .then((v) => console.log("chain", v));
Promise.reject("r").catch((e) => console.log("caught2", e));
Promise.resolve(1).then((v) => { throw new Error("m"); }).catch((e) => console.log("c3", (e as Error).message));
Promise.all([1, 2]).then((v) => console.log("all", JSON.stringify(v)));
Promise.allSettled([1, Promise.reject("x")]).then((v) => console.log("settled", JSON.stringify(v)));
Promise.race([1, 2]).then((v) => console.log("race", v));
Promise.any([Promise.reject("e"), 2]).then((v) => console.log("any", v));
console.log("sync");
})();
