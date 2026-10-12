// xl:title thenable 的吸收与 then 的链式返回
// xl:round 623
// xl:judge stdout
// xl:end

const thenable = { then(res: any) { res(7); } };
Promise.resolve(thenable as any).then((v) => console.log("thenable", v));
Promise.resolve(1).then((v) => v + 1).then((v) => console.log("chain", v));
