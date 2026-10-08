// xl:title `lastIndexOf` / `indexOf` 的负零起点那一格
// xl:round 745
// xl:judge stdout
// xl:end
console.log([1, 2, 3].lastIndexOf(1, -0), [1, 2, 3].lastIndexOf(1, 0));
console.log([1, 2, 3].lastIndexOf(1, -3), [1, 2, 3].lastIndexOf(1, -4));
console.log(Object.is([1, 2, 3].lastIndexOf(1, -0), -0));
console.log([1, 2, 3].lastIndexOf(3, -3), [1, 2, 3].lastIndexOf(3, -1));
