// xl:title 文本统计：正则无关的字符族与排序
// xl:round 681
// xl:judge stdout
// xl:end
const text = 'the Quick brown fox';
const freq: any = {};
for (const ch of text.toLowerCase()) { if (ch === ' ') continue; freq[ch] = (freq[ch] ?? 0) + 1; }
const top = Object.entries(freq).sort((a: any, b: any) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3);
console.log(top.map((e: any) => e[0] + e[1]).join(','));
console.log(text.split(' ').length, text.slice(0, 3), text.toUpperCase().includes('FOX'));
