// xl:title 嵌套结构的 JSON 往返与逐层校验
// xl:round 371
// xl:judge stdout
// xl:end
const data = {
  users: [
    { id: 1, tags: ["a", "b"], meta: { active: true } },
    { id: 2, tags: [], meta: { active: false, note: null } },
  ],
  count: 2,
};
const text = JSON.stringify(data);
const back = JSON.parse(text);
console.log(text.length, back.users.length, back.users[0].tags.join("|"));
console.log(back.users[1].meta.note, back.count, JSON.stringify(back.users[0]) === JSON.stringify(data.users[0]));
console.log(Object.keys(back.users[1].meta).join(","), Array.isArray(back.users));
