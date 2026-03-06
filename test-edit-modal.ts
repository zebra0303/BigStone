import * as fs from "fs";
const file = fs.readFileSync("client/src/features/todo/ui/TodoEditModal.tsx", "utf-8");
console.log(file.split('\n').filter((l, i) => i > 25 && i < 45).join('\n'));
