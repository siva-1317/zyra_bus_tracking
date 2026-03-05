const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected for bulk upload"))
  .catch(err => console.error(err));

async function run() {
  const students = [];

  fs.createReadStream("scripts/students.csv")
    .pipe(csv())
    .on("data", (row) => students.push(row))
    .on("end", async () => {
      for (const s of students) {
        // check duplicate
        const exists = await Student.findOne({ rollNumber: s.rollNumber });
        if (exists) {
          console.log(`⚠️ Skipped ${s.rollNumber} (already exists)`);
          continue;
        }

        const hashed = await bcrypt.hash("student123", 10);

        const user = await User.create({
          username: s.rollNumber,
          password: hashed,
          role: "student"
        });

        await Student.create({
          userId: user._id,
          rollNumber: s.rollNumber,
          name: s.name,
          department: s.department,
          year: s.year,
          phone: s.phone
        });

        console.log(`✅ Added ${s.rollNumber}`);
      }

      console.log("🎉 Bulk student upload completed");
      process.exit();
    });
}

run();
