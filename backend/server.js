require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const auth = require("./middleware/auth.middleware");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/driver", require("./routes/driver.routes"));
app.use("/api/student", require("./routes/student.routes"));

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});

app.get("/api/test", auth, (req, res) => {
  res.json({
    message: "JWT is working",
    user: req.user
  });
});