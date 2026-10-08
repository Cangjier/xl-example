// xl:title 配置合并：JSON 往返 + 深合并 + 数组去重
// xl:round 681
// xl:judge stdout
// xl:end
const base = JSON.parse('{"a":1,"b":{"c":2},"list":[1,2]}');
const over = JSON.parse('{"b":{"d":3},"list":[2,3]}');
function merge(x: any, y: any): any { const out: any = { ...x }; for (const k of Object.keys(y)) { const v = y[k]; out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? merge(x[k] ?? {}, v) : v; } return out; }
const m = merge(base, over);
m.list = [...new Set([...base.list, ...over.list])];
console.log(JSON.stringify(m));
