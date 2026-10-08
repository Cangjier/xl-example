// xl:title Promise.all 里的普通值与承诺混着
// xl:round 682
// xl:judge stdout
// xl:end
(async () => {
  const out = await Promise.all([1, Promise.resolve(2), 'x']);
  console.log(out.join(','));
  const nested = await Promise.all([Promise.resolve([1, 2]), Promise.resolve([3])]);
  console.log(nested.map((a: any) => a.join('-')).join('|'));
})();
