// xl:title 承诺：`all` / `race` / `allSettled` / `any` 的形状
// xl:round 748
// xl:judge stdout
// xl:end
// 本文件是 `p748a-a15` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

Promise.all([1, Promise.resolve(2), 3]).then((vs) => console.log("all", vs.join(",")));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
Promise.allSettled([Promise.resolve(1), Promise.reject("x")]).then((rs: any) => console.log("settled", rs.map((r: any) => r.status + ":" + String(r.value ?? r.reason)).join(",")));
Promise.any([Promise.reject("a"), Promise.resolve("b")]).then((v) => console.log("any", v));
Promise.any([Promise.reject("a"), Promise.reject("b")]).catch((e: any) => console.log("anyerr", (e as Error).constructor.name, e.errors.join(",")));
Promise.all([]).then((vs) => console.log("empty", vs.length));
