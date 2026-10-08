// xl:title 库存汇总：reduce / Object.entries / 数值格式化
// xl:round 681
// xl:judge stdout
// xl:end
const items = [['pen', 3, 1.5], ['book', 1, 12], ['pen', 2, 1.5], ['bag', 5, 0.25]] as any;
const totals: any = {};
for (const [name, qty, price] of items) totals[name] = (totals[name] ?? 0) + qty * price;
const lines = Object.entries(totals).map(([k, v]: any) => k + '=' + Number(v).toFixed(2));
console.log(lines.sort().join(' '));
