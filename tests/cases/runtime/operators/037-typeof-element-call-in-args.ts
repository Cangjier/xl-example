// xl:title `typeof` 的操作数是「下标调用」，而且它不是实参表的第一格
// xl:round 307
// xl:judge stdout
// xl:end

const o: any = { m: () => ({ a: 1 }) };
console.log("x", typeof (o["m"]()));
