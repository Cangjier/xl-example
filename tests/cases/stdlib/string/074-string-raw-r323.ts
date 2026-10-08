// xl:title String.raw：标签模板的 raw 那一栏原样取出
// xl:round 323
// xl:judge stdout
// xl:end

const s = String.raw`a\nb`;
console.log(s, s.length);
console.log(String.raw`x${1 + 1}y\t`, String.raw({ raw: ["p", "q"] }, "-"));
