// xl:title 小型词法：字符串扫描 + 数组 + switch
// xl:round 683
// xl:judge stdout
// xl:end
function tokenize(src: string): string[] { const out: string[] = []; let i = 0; while (i < src.length) { const ch = src[i]; if (ch === ' ') { i++; continue; } if (ch >= '0' && ch <= '9') { let n = ''; while (i < src.length && src[i] >= '0' && src[i] <= '9') n += src[i++]; out.push('num:' + n); continue; } if (ch === '+' || ch === '*') { out.push('op:' + ch); i++; continue; } out.push('id:' + ch); i++; } return out; }
console.log(tokenize('12 + x*3').join(' '));
