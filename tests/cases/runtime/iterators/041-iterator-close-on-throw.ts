// xl:title `for...of` 体里抛出时也会调 `return()`
// xl:round 691
// xl:judge stdout
// xl:end
const it: any = {
  i: 0,
  next() { this.i++; return this.i <= 3 ? { value: this.i, done: false } : { value: undefined, done: true }; },
  return() { console.log("closed"); return { value: undefined, done: true }; },
  [Symbol.iterator]() { return this; },
};
try {
  for (const v of it) { console.log("v", v); if (v === 2) throw new Error("stop"); }
} catch (e: any) { console.log("caught", e.message); }
