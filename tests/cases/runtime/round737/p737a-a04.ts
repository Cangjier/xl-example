// xl:title `for..of` 里 `break` / `return` 要调迭代器的 `return()`
// xl:round 737
// xl:judge stdout
// xl:end
const log: string[] = [];
const src: any = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() { i += 1; return { value: i, done: i > 5 }; },
      return(v: any) { log.push("return:" + v); return { value: v, done: true }; },
    };
  },
};
for (const v of src) { if (v === 2) break; }
console.log(log.join("|"));
function f() { for (const v of src) { if (v === 3) return "out"; } return "end"; }
console.log(f(), log.join("|"));
