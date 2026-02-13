# 🚌ZYRA College Bus Management System

A Full-Stack Role-Based Bus Tracking & Management System built using **React.js, Node.js, Express.js, and MongoDB**.

This system manages Students, Drivers, Buses, and Admin operations with secure authentication and real-time stop-based tracking.


---

# 📌 Table of Contents

- Project Overview
- User Roles
- Authentication Flow
- Student Module
- Driver Module
- Admin Module
- Bus Tracking Logic
- Technology Stack
- Installation Guide
- Environment Variables
- API Overview
- Security
- Future Enhancements

---

# 🚀 Project Overview

The **College Bus Management System** streamlines college transportation management using:

- Role-Based Access Control
- JWT Authentication
- Stop-Based Bus Tracking
- Admin Management Panel
- Leave & Feedback Management

---

# 👥 User Roles

The system supports three roles:

1. **Student**
2. **Driver**
3. **Admin**

Each role has restricted access using middleware-based authorization.

---

# 🔐 Authentication Flow

App Launch

↓

Login (Username + Password)

↓

JWT Authentication

↓

Role Identification

↓

Redirect to Role-Based Dashboard



---

# 🎓 Student Module

Students can:

- View Profile
- View Assigned Bus
- View Driver Details
- View Stop-Based Progress Line
- See ETA Calculation
- View Announcements
- Submit Feedback
- Change Password

---

# 🚍 Driver Module

Drivers can:

- View Assigned Bus
- View Route & Stops
- Update Current Stop
- Apply Leave
- View Leave Status
- Submit Feedback
- Change Password

---

# 🛠 Admin Module

Admins can:

- Add / Update / Delete Buses
- Add / Update / Delete Students
- Assign Bus to Student (Manual)
- Assign Drivers to Buses
- Reset Passwords
- Approve / Reject Leave
- Post Announcements
- Monitor Dashboard Statistics
- Review Feedback

---

# 📍 Bus Stop Assignment Logic

### First Time Assignment

1. Student selects stop.
2. Backend matches stop with bus route.
3. Bus assigned automatically.

### Manual Reassignment

Admin updates student stop → system reassigns bus.

---

# 📊 Bus Tracking Logic (Progress Line System)

Instead of map-based tracking, this system uses:

- Straight-line stop visualization
- Completed stops marked
- Current stop highlighted
- Upcoming stops displayed
- ETA calculated using time difference

### Time Calculation Logic

Stop Time = 07:15
Current Time = 07:05
Difference = 10 minutes


Output: Bus arriving in 10 minutes


---

# 🏗 System Architecture

React Frontend

↓

Axios API Calls

↓

Express Backend

↓

JWT Middleware

↓

MongoDB Database


---

# 🧩 Technology Stack

## Frontend
- React.js
- React Bootstrap
- Axios

## Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt (Password Hashing)

## Database
- MongoDB Atlas
- Mongoose ODM

---

# 📡 Important API Routes

## Student

- GET /student/profile

 - PUT /student/change-password

## Driver

- GET /driver/profile

- PUT /driver/update-stop

## Admin

- POST /admin/bus

 - PUT /admin/bus/:busNo

- DELETE /admin/bus/:busNo

- POST /admin/student

- PUT /admin/student/:rollNumber

- PUT /admin/reset-student-password/:rollNumber

- PUT /admin/assign-driver

---

# Admin Dashboard Statistics

- Total Buses

- Running / Planned / Completed Trips

- Total Students

- Assigned / Unassigned Students

- Total Drivers

- Feedback Status Overview

---

# 🔒 Security Features

- Password Hashing using bcrypt

- JWT Authentication

- Role-Based Middleware

- Protected API Routes

- No sensitive data in localStorage

---

# 🎯 Benefits

- Secure Role-Based Architecture

- Real-Time Stop Tracking

- Scalable Design

- Efficient Admin Management

- Structured System Flow

- Clean UI with Bootstrap

  ---

  ### 👨‍💻 Developer

  Siva M
  
  B.E Mechanical Engineering
  
  Full Stack Developer | AI Enthusiast

