// xl:title 符号键计算名的方法：能挂能取、不进 Object.keys、能列进 getOwnPropertySymbols
// xl:round 650
// xl:judge stdout
// xl:end

class Res {
  closed = false;
  [Symbol.dispose]() {
    this.closed = true;
    return "disposed";
  }
}
const r = new Res();
console.log(Object.keys(r).join(",") === "closed", typeof r[Symbol.dispose], r[Symbol.dispose](), r.closed);
const key = Symbol("k");
const obj: any = { [key]: 1, plain: 2 };
console.log(Object.keys(obj).join(","), obj[key], Object.getOwnPropertySymbols(obj).length);
