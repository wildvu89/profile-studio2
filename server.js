const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 10000;

// phục vụ thư mục "public" (chứa HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
