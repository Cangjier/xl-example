// xl:title 成绩单：解构 + reduce + 排序 + 模板
// xl:round 682
// xl:judge stdout
// xl:end
const rows = [['ann', 90, 80], ['bob', 70, 95], ['cid', 60, 60]] as any;
const scored = rows.map(([name, a, b]: any) => ({ name, avg: (a + b) / 2 }));
scored.sort((x: any, y: any) => y.avg - x.avg || (x.name < y.name ? -1 : 1));
for (const s of scored) console.log(s.name + '=' + s.avg.toFixed(1));
console.log('class', (scored.reduce((acc: any, s: any) => acc + s.avg, 0) / scored.length).toFixed(2));
