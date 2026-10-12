// xl:title 标签模板后面接的属性 / 下标 / 调用
// xl:judge stdout
// xl:end

const tag = (s: any, ...v: any[]) => ({ text: s.join("|") + v.join(""), len: s[0].length });
const r: any = tag`ab${1}c`;
console.log(r.text, r.len);
const arr = [tag`x`, tag`y`];
console.log(arr.length, arr[1].text);
function wrap(f: any): any { return f`p`; }
console.log(wrap(tag).text);
