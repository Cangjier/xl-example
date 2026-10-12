// xl:title Promise 的组合子形状
// xl:round 683
// xl:judge stdout
// xl:end
async function run() {
  const settled = await Promise.allSettled([Promise.resolve(1), Promise.reject('e')]);
  console.log('settled', settled.map((r: any) => r.status + ':' + String(r.value ?? r.reason)).join(','));
  const race = await Promise.race([Promise.resolve('fast'), Promise.resolve('slow')]);
  console.log('race', race);
  const any = await Promise.any([Promise.reject('x'), Promise.resolve('ok')]);
  console.log('any', any);
}
run();
