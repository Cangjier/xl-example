// xl:title 抛 null / 抛对象 / 抛数字，catch 拿到的是原样那个值
// xl:judge stdout
// xl:end

function probe(v: any) { try { throw v; } catch (e: any) { return e === v ? "same" : "other"; } }
console.log(probe(null), probe(undefined), probe(0), probe(""), probe(false));
const obj = { tag: 1 };
try { throw obj; } catch (e: any) { console.log(e === obj, e.tag); }
