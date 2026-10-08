// xl:title `Promise.all` 的结果次序与值
// xl:round 691
// xl:judge stdout
// xl:end
Promise.all([Promise.resolve(2), 1, Promise.resolve(3)] as any).then((v: any) => console.log(JSON.stringify(v)));
Promise.all([] as any).then((v: any) => console.log("empty", JSON.stringify(v)));
Promise.allSettled([Promise.reject(new Error("x")), 1] as any).then((v: any) => console.log(v.map((e: any) => e.status).join(",")));
