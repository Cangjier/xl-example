// xl:title `generator.return()` 交回的值与 `done`
// xl:round 691
// xl:judge stdout
// xl:end
function* gen(): any { yield 1; yield 2; }
const it: any = gen();
console.log(it.next().value);
console.log(JSON.stringify(it.return(9)));
console.log(JSON.stringify(it.next()));
