// xl:title Promise.resolve 吃 thenable；all / race 收空数组
// xl:judge stdout
// xl:end

const thenable = { then(res: (v: string) => void) { res("t"); } };
const run = async () => {
  console.log(await Promise.resolve(thenable));
  console.log(JSON.stringify(await Promise.all([])));
  console.log(await Promise.race([]).then(() => "never", () => "never"));
  console.log(JSON.stringify(await Promise.allSettled([])));
};
run();
