const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("../models/User");
const Driver = require("../models/Driver");

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected for bulk upload"))
  .catch(err => console.error(err));

async function run() {
  const drivers = [];

  fs.createReadStream("scripts/drivers.csv")
    .pipe(csv())
    .on("data", (row) => drivers.push(row))
    .on("end", async () => {
      for (const d of drivers) {
        // check duplicate
        const exists = await Driver.findOne({ driverId: d.driverId });
        if (exists) {
          console.log(`⚠️ Skipped ${d.driverId} (already exists)`);
          continue;
        }

        const hashed = await bcrypt.hash("driver123", 10);

        const user = await User.create({
          username: d.driverId,
          password: hashed,
          role: "driver"
        });

        await Driver.create({
          userId : user._id,
          driverId : d.driverId,
          name : d.name,
          phone : d.phone,
          licenseNo : d.licenseNo
        });

        console.log(`✅ Added ${d.name}`);
      }

      console.log("🎉 Bulk student upload completed");
      process.exit();
    });
}

run();
