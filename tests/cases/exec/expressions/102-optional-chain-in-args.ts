// xl:title 可选链在实参位与返回位：短路整条表达式、undefined 照传
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
const take = (a: any, b: any) => { log.push(String(a) + "/" + String(b)); return a; };
const o: any = { f: () => "v" };
console.log(take(o?.f(), o?.missing));
const none: any = null;
console.log(take(none?.f(), none?.x?.y), log.join(","));
console.log([o?.f?.(), none?.f?.()].length, [...(o?.list ?? [1])].join(","));
