const path = require("path");
const fs = require("fs");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "replace-this-secret";

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    callback(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.mimetype)) {
      return callback(new Error("Unsupported file type"));
    }
    return callback(null, true);
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const users = [
  { id: 1, username: "student1", name: "Aarav Shah", role: "student", class: "8", division: "A", rollNumber: "12", busRoute: "Route 3" },
  { id: 2, username: "teacher1", name: "Ms. Isha Rao", role: "teacher", subjects: ["Math", "Science"], classes: ["8A", "9B"] },
  { id: 3, username: "principal", name: "Dr. Anil Menon", role: "principal" }
];

const passwordMap = new Map();
const defaultPassword = "Welcome@123";
users.forEach((user) => {
  passwordMap.set(user.username, bcrypt.hashSync(defaultPassword, 10));
});

const attendance = [
  { id: 1, student: "Aarav Shah", class: "8A", date: "2024-06-10", status: "Present" },
  { id: 2, student: "Maya Patel", class: "8A", date: "2024-06-10", status: "Absent" }
];

const notes = [
  { id: 1, title: "Algebra Basics", subject: "Math", class: "8A", date: "2024-06-08", file: "algebra-basics.pdf" },
  { id: 2, title: "Cells and Tissues", subject: "Science", class: "8A", date: "2024-06-09", file: "cells-tissues.pdf" }
];

const behaviorNotes = {
  students: [
    { id: 1, student: "Aarav Shah", note: "Excellent participation in class.", author: "Ms. Isha Rao", date: "2024-06-07" }
  ],
  teachers: [
    { id: 1, teacher: "Ms. Isha Rao", note: "Consistent lesson planning and positive parent feedback.", author: "Dr. Anil Menon", date: "2024-06-05" }
  ]
};

const leaveApplications = [
  { id: 1, student: "Aarav Shah", class: "8A", reason: "Medical appointment", date: "2024-06-12", status: "Pending" }
];

const transportRoutes = [
  { id: 1, route: "Route 1", stops: ["Lake View", "Green Park"], time: "7:30 AM" },
  { id: 2, route: "Route 3", stops: ["Central Mall", "Hill Road"], time: "7:15 AM" }
];

const timetables = {
  school: [
    { class: "8A", day: "Monday", periods: ["Math", "English", "Science", "History"] },
    { class: "8A", day: "Tuesday", periods: ["Science", "Math", "Geography", "PE"] }
  ],
  exams: [
    { class: "8A", exam: "Mid-Term", date: "2024-07-02", subject: "Math" },
    { class: "8A", exam: "Mid-Term", date: "2024-07-03", subject: "Science" }
  ]
};

const notices = [
  { id: 1, title: "Parent-Teacher Meeting", date: "2024-06-20", content: "Scheduled for 10 AM in the auditorium." }
];

const websiteSections = [
  { id: 1, title: "About School", content: "Sunrise Public School fosters holistic growth." },
  { id: 2, title: "Principal's Message", content: "Welcome to a year of curiosity and achievement." }
];

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
};

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
};

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((item) => item.username === username);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const storedHash = passwordMap.get(username);
  if (!bcrypt.compareSync(password, storedHash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = generateToken(user);
  return res.json({ token, role: user.role, name: user.name });
});

app.get("/api/me", authenticate, (req, res) => {
  const user = users.find((item) => item.id === req.user.id);
  return res.json({ user });
});

app.get("/api/attendance", authenticate, (req, res) => {
  if (req.user.role === "student") {
    const user = users.find((item) => item.id === req.user.id);
    return res.json(attendance.filter((record) => record.student === user.name));
  }
  return res.json(attendance);
});

app.post("/api/attendance", authenticate, authorizeRoles("teacher", "principal"), (req, res) => {
  const { student, className, date, status } = req.body;
  const newRecord = { id: attendance.length + 1, student, class: className, date, status };
  attendance.push(newRecord);
  return res.status(201).json(newRecord);
});

app.get("/api/notes", authenticate, (req, res) => {
  return res.json(notes);
});

app.post("/api/notes", authenticate, authorizeRoles("teacher", "principal"), upload.single("file"), (req, res) => {
  const { title, subject, className, date } = req.body;
  const entry = {
    id: notes.length + 1,
    title,
    subject,
    class: className,
    date,
    file: req.file ? req.file.filename : null
  };
  notes.push(entry);
  return res.status(201).json(entry);
});

app.get("/api/behavior/students", authenticate, authorizeRoles("teacher", "principal"), (req, res) => {
  return res.json(behaviorNotes.students);
});

app.get("/api/behavior/teachers", authenticate, authorizeRoles("principal"), (req, res) => {
  return res.json(behaviorNotes.teachers);
});

app.post("/api/behavior/students", authenticate, authorizeRoles("teacher", "principal"), (req, res) => {
  const { student, note } = req.body;
  const entry = { id: behaviorNotes.students.length + 1, student, note, author: req.user.name, date: new Date().toISOString().slice(0, 10) };
  behaviorNotes.students.push(entry);
  return res.status(201).json(entry);
});

app.post("/api/behavior/teachers", authenticate, authorizeRoles("principal"), (req, res) => {
  const { teacher, note } = req.body;
  const entry = { id: behaviorNotes.teachers.length + 1, teacher, note, author: req.user.name, date: new Date().toISOString().slice(0, 10) };
  behaviorNotes.teachers.push(entry);
  return res.status(201).json(entry);
});

app.get("/api/transport", authenticate, (req, res) => {
  return res.json(transportRoutes);
});

app.post("/api/transport/applications", authenticate, authorizeRoles("student"), (req, res) => {
  const { route, stop } = req.body;
  return res.status(201).json({ id: Date.now(), student: req.user.name, route, stop, status: "Submitted" });
});

app.get("/api/timetables/school", authenticate, (req, res) => {
  return res.json(timetables.school);
});

app.get("/api/timetables/exams", authenticate, (req, res) => {
  return res.json(timetables.exams);
});

app.get("/api/notices", authenticate, (req, res) => {
  return res.json(notices);
});

app.post("/api/notices", authenticate, authorizeRoles("principal"), (req, res) => {
  const { title, content } = req.body;
  const entry = { id: notices.length + 1, title, date: new Date().toISOString().slice(0, 10), content };
  notices.push(entry);
  return res.status(201).json(entry);
});

app.get("/api/website", (_req, res) => {
  return res.json(websiteSections);
});

app.post("/api/leave-applications", authenticate, authorizeRoles("student"), (req, res) => {
  const { reason, date } = req.body;
  const entry = { id: leaveApplications.length + 1, student: req.user.name, class: "8A", reason, date, status: "Pending" };
  leaveApplications.push(entry);
  return res.status(201).json(entry);
});

app.get("/api/leave-applications", authenticate, authorizeRoles("principal"), (_req, res) => {
  return res.json(leaveApplications);
});

app.post("/api/leave-applications/:id/decision", authenticate, authorizeRoles("principal"), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const record = leaveApplications.find((item) => item.id === Number(id));
  if (!record) {
    return res.status(404).json({ message: "Leave application not found" });
  }
  record.status = status;
  return res.json(record);
});

app.listen(PORT, () => {
  console.log(`School Management app running on http://localhost:${PORT}`);
});
