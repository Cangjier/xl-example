// xl:title bind / call / apply 的 this 与实参形态
// xl:round 371
// xl:judge stdout
// xl:end
function who(this: any, ...rest: unknown[]): string { return String(this && this.tag) + ":" + rest.join("|"); }
console.log(who.call({ tag: "o" }, 1, 2));
console.log(who.apply({ tag: "a" }, [3, 4]));
const bound = who.bind({ tag: "b" }, 5);
console.log(bound(6, 7));
console.log(who.call(null as any, 1), who.apply(undefined as any, []));
const obj = { tag: "m", who };
console.log(obj.who(8));
const detached = obj.who;
console.log(typeof detached(9));
