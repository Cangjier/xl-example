// xl:title 带内插的模板串：每一段都是**熟**的
// xl:round 333
// xl:judge stdout
// xl:end

const x = 1;
console.log(`a\nb${x}`.length, `a\nb${x}`.indexOf("\n"));
console.log(`c\td${x}e`.length, `\u00e9${x}`.length);
console.log(`\x41\u0042${x}`.length, `\u{1F600}${x}`.length);
console.log(`q\\r${x}`.length);
const long = `one
two${x}`;
console.log(long.length, long.indexOf("\n") > 0);
