// xl:title values / keys / entries 与 Symbol.iterator 是同一件东西
// xl:round 371
// xl:judge stdout
// xl:end
const xs = ["a", "b"];
console.log([...xs.values()].join(""), [...xs.keys()].join(""), [...xs.entries()].map((e) => e.join(":")).join(" "));
console.log(xs[Symbol.iterator] === xs.values);
const it = xs[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
