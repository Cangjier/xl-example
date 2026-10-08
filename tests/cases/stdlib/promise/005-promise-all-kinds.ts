// xl:title Promise.all：混合值、空数组、有一个拒绝
// xl:judge stdout
// xl:end

Promise.all([1, Promise.resolve(2), "3"]).then((xs: any) => console.log("mixed", xs.join(",")));
Promise.all([Promise.reject("bad"), Promise.resolve(1)]).catch((e: any) => console.log("rejected", e));
