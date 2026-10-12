// xl:title `Promise.race` 第一个结清的是**拒绝**时，结果承诺要跟着拒绝
// xl:round 766
// xl:judge stdout
// xl:note 第 766 轮收掉的一格：`race` 原来按 `wants = 2`（两档都认、回调照跑）调度，
// xl:note 而它的回调（`PromiseRaceStep`）只会**兑现**结果承诺 ⇒ 第一个结清的是拒绝时，
// xl:note 结果承诺被**兑现**成那个原因对象 ⇒ `.catch` **一声不响**
// xl:note（`Promise.race([Promise.reject(e), Promise.resolve(1)])` 本仓什么都不打，Node 打 `e`）。
// xl:note 现在 `race` 也走 `wants = 0`：兑现那一档跑那一步，拒绝那一档由引擎
// xl:note 「没认这一档」那条路把**它的原因**拒绝给结果承诺——谁先结清、按它自己那一档定。
// xl:note 四种次序一起钉：拒绝在前、兑现在前、两个都拒绝、以及 `all` 那一档的对照。
// xl:end
Promise.race([Promise.reject(new Error("fast")), Promise.resolve(1)]).catch((e) => console.log("01", e.message));
Promise.race([Promise.resolve(1), Promise.reject(new Error("late"))]).then((v) => console.log("02", v));
Promise.race([Promise.reject(new Error("a")), Promise.reject(new Error("b"))]).catch((e) => console.log("03", e.message));
Promise.race([1, 2]).then((v) => console.log("04", v));
Promise.race([]).then((v) => console.log("05", v));
Promise.all([Promise.reject(new Error("boom")), Promise.resolve(1)]).catch((e) => console.log("06", e.message));
Promise.any([Promise.reject(new Error("x")), Promise.resolve("c")]).then((v) => console.log("07", v));
Promise.resolve().then(() => console.log("08 tick"));
