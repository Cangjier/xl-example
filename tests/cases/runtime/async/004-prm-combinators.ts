// xl:title Promise.all / race：顺序与先到先得
// xl:judge stdout
// xl:end

Promise.all([Promise.resolve(1), Promise.resolve(2), 3]).then((xs: any) => console.log("all", xs.join(",")));
Promise.race([Promise.resolve("fast"), Promise.resolve("slow")]).then((v: any) => console.log("race", v));
Promise.all([]).then((xs: any) => console.log("empty", xs.length));
