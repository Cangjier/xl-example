// xl:title KMP 子串查找与所有出现位置
// xl:round 371
// xl:judge stdout
// xl:end
function buildTable(pattern: string): number[] {
  const table: number[] = [0];
  let len = 0;
  for (let i = 1; i < pattern.length; i++) {
    while (len > 0 && pattern.charAt(i) !== pattern.charAt(len)) len = table[len - 1];
    if (pattern.charAt(i) === pattern.charAt(len)) len += 1;
    table.push(len);
  }
  return table;
}
function searchAll(text: string, pattern: string): number[] {
  if (pattern.length === 0) return [];
  const table = buildTable(pattern);
  const hits: number[] = [];
  let len = 0;
  for (let i = 0; i < text.length; i++) {
    while (len > 0 && text.charAt(i) !== pattern.charAt(len)) len = table[len - 1];
    if (text.charAt(i) === pattern.charAt(len)) len += 1;
    if (len === pattern.length) { hits.push(i - len + 1); len = table[len - 1]; }
  }
  return hits;
}
console.log(buildTable("ababaca").join(","));
console.log(searchAll("abababab", "abab").join(","));
console.log(searchAll("aaaa", "aa").join(","), searchAll("abc", "z").length);
console.log(searchAll("the cat sat on the mat", "at").join(","));
