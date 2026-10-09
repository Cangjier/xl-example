// xl:title `Promise` 组合子：`all` / `allSettled` / `race` / `any` 的形状
// xl:round 766
// xl:judge stdout
// xl:note 四个组合子的**结果形状**一次钉住（每个都用 `JSON.stringify` 打印，
// xl:note 好让 `allSettled` 那一族的结果对象（`status` / `value` / `reason`）逐字段可比）。
// xl:note `any` 取**第一个兑现**的、`race` 取**第一个结清**的——两者都在同一批里量。
// xl:end
Promise.all([Promise.resolve(1), 2, "x"]).then((v) => console.log("01", JSON.stringify(v)));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((v) => console.log("02", JSON.stringify(v)));
Promise.race([Promise.resolve("a"), Promise.resolve("b")]).then((v) => console.log("03", v));
Promise.any([Promise.reject(new Error("x")), Promise.resolve("c")]).then((v) => console.log("04", v));
Promise.all([]).then((v) => console.log("05", JSON.stringify(v), v.length));
Promise.allSettled([]).then((v) => console.log("06", JSON.stringify(v)));
Promise.all([Promise.reject(new Error("boom")), Promise.resolve(1)]).catch((e) => console.log("07", e.message));
Promise.race([Promise.reject(new Error("fast")), Promise.resolve(1)]).catch((e) => console.log("08", e.message));
console.log("done");
