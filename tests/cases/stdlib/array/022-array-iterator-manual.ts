// xl:title 手动取数组迭代器：values / keys / entries 的 next()
// xl:judge stdout
// xl:end

const it = [10, 20].values();
console.log(it.next().value, it.next().value, it.next().done);
const ks = [10, 20].keys();
console.log(ks.next().value, ks.next().value, ks.next().done);
console.log([...["a", "b"].entries()].map((p) => p.join(":")).join(","));
