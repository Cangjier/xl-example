// xl:title `await` 后面跟数组字面量 / 括号表达式
// xl:round 726
// xl:judge stdout
// xl:end
(async () => {
  console.log("array", (await [1, 2]).length);
  console.log("paren", await (1 + 2));
  console.log("deep", (await Promise.resolve({ v: 6 })).v);
  const both: any = await [{ v: 7 }];
  console.log("inArray", both[0].v);
})();
