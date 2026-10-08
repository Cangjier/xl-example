// xl:title `.finally(cb)` 的回调**返回一份被拒绝的承诺**时，结果承诺要跟着拒绝
// xl:round 766
// xl:judge stdout
// xl:note 第 766 轮收掉的一格：规范里 `p.finally(cb)` 是
// xl:note `then(v => Promise.resolve(cb()).then(() => v))` 拼出来的——
// xl:note 所以回调**返回的那份承诺**被拒绝时，结果承诺跟着拒绝（而不是把源那一档传下去）。
// xl:note 本仓原来把回调的返回值**丢掉**（那一跳照旧传源那一档）⇒ 那个 `.catch` **一声不响**。
// xl:note 现在的做法是把那一跳挂**回调返回的那份承诺**上、只认兑现那一档：
// xl:note 它兑现 ⇒ 照常把源那一档灌进结果；它被拒绝 ⇒ 引擎把**它的原因**拒绝给结果。
// xl:note 四档一起钉：回调返回被拒绝的承诺、返回被兑现的承诺、回调自己抛、
// xl:note 以及源本来就是拒绝的（拒绝那一档要**照旧**传下去）。
// xl:end
Promise.resolve(1).finally(() => Promise.reject(new Error("from-finally"))).catch((e) => console.log("01", e.message));
Promise.resolve(1).finally(() => Promise.resolve("ignored")).then((v) => console.log("02", v));
Promise.reject(new Error("upstream")).finally(() => { console.log("03 fin"); }).catch((e) => console.log("04", e.message));
Promise.resolve(1).finally(() => { throw new Error("thrown-in-finally"); }).catch((e) => console.log("05", e.message));
Promise.resolve("keep").finally(() => "plain").then((v) => console.log("06", v));
Promise.resolve().then(() => console.log("07 tick"));
