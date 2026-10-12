// xl:title getter 里抛：try 接得住、类别还在
// xl:judge stdout
// xl:end

const o = {
  get boom(): number {
    throw new Error("bad");
  },
};
try {
  console.log(o.boom);
} catch (e) {
  console.log(e instanceof Error, (e as Error).message);
}
console.log("after");
