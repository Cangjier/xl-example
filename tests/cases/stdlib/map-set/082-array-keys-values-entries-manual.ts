// xl:title Array.keys / values / entries 的迭代器返回形状
// xl:judge stdout
// xl:end

const it = ["a", "b"].keys();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log(JSON.stringify([..."a"].values().next()));
console.log([...[10, 20].entries()].map((p) => p.join(":")).join(","));
