// xl:title 回文判定、最长回文子串与字符统计
// xl:round 371
// xl:judge stdout
// xl:end
function isPalindrome(s: string): boolean {
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (s.charAt(i) !== s.charAt(j)) return false;
    i += 1;
    j -= 1;
  }
  return true;
}
function longestPalindrome(s: string): string {
  let best = "";
  for (let center = 0; center < s.length; center++) {
    for (const [start, end] of [[center, center], [center, center + 1]]) {
      let l = start;
      let r = end;
      while (l >= 0 && r < s.length && s.charAt(l) === s.charAt(r)) { l -= 1; r += 1; }
      const found = s.slice(l + 1, r);
      if (found.length > best.length) best = found;
    }
  }
  return best;
}
function charCounts(s: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
for (const s of ["racecar", "abba", "abc", ""]) console.log(JSON.stringify(s), isPalindrome(s));
console.log(longestPalindrome("babad"), longestPalindrome("cbbd"), longestPalindrome("a"));
console.log(charCounts("mississippi").slice(0, 3).map(([c, n]) => c + n).join(""));
console.log(longestPalindrome("").length, isPalindrome("a"));
