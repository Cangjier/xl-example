// xl:title String.codePointAt
// xl:judge stdout
// xl:end

const s = "A\u{1F600}";
console.log(s.codePointAt(0), s.codePointAt(1) > 0xffff, s.codePointAt(9));
