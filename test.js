const http = require("http");
const req = http.request(
  "http://localhost:3001/api/todos",
  { method: "POST", headers: { "Content-Type": "application/json" } },
  (res) => {
    let data = "";
    res.on("data", (d) => (data += d));
    res.on("end", () => console.log("Response:", res.statusCode, data));
  },
);
req.write(
  JSON.stringify({
    title: "Test",
    status: "TODO",
    dueDate: new Date().toISOString(),
    recurring: { type: "NONE" },
  }),
);
req.end();
