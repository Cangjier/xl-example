// xl:title String.length / 下标读 / at
// xl:judge stdout
// xl:end

const s = "abc";
console.log(s.length, s[0], s[2], s[9], s[-1]);
console.log(s.at ? s.at(0) : "no-at", "" .length);
