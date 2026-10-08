// xl:title 可选调用的**短路**不越过后续链节
// xl:round 741
// xl:judge stdout
// xl:end
const log: string[] = [];
const o: any = { a: null };
console.log(o.a?.b.c, log.length);
console.log(o?.missing?.deep.deeper);
