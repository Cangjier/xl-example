// xl:title CSV 报表：split / padStart / sort / join
// xl:round 681
// xl:judge stdout
// xl:end
const rows = ['b,2', 'a,10', 'c,1'];
const parsed = rows.map((r) => { const p = r.split(','); return { name: p[0], n: Number(p[1]) }; });
parsed.sort((x, y) => y.n - x.n || (x.name < y.name ? -1 : 1));
for (const r of parsed) console.log(r.name.padStart(3, '.') + ' ' + String(r.n).padStart(3, '0'));
console.log(parsed.map((r) => r.name).join('-'));
