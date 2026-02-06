const loginForm = document.getElementById("loginForm");
const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const logoutBtn = document.getElementById("logoutBtn");

const rolePill = document.getElementById("rolePill");
const welcomeTitle = document.getElementById("welcomeTitle");
const roleSubtitle = document.getElementById("roleSubtitle");
const quickStats = document.getElementById("quickStats");

const profileContent = document.getElementById("profileContent");
const attendanceContent = document.getElementById("attendanceContent");
const notesContent = document.getElementById("notesContent");
const timetableContent = document.getElementById("timetableContent");
const transportContent = document.getElementById("transportContent");
const behaviorContent = document.getElementById("behaviorContent");
const noticesContent = document.getElementById("noticesContent");
const websiteContent = document.getElementById("websiteContent");

let authToken = null;
let currentRole = null;

const fetchData = async (endpoint, options = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};

const renderCards = (items) => {
  quickStats.innerHTML = items
    .map((item) => `
      <div class="card">
        <h4>${item.label}</h4>
        <p>${item.value}</p>
      </div>
    `)
    .join("");
};

const renderList = (container, items, formatter) => {
  container.innerHTML = items.map((item) => `<div>${formatter(item)}</div>`).join("");
};

const login = async (username, password) => {
  const response = await fetchData("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  authToken = response.token;
  currentRole = response.role;
  await loadDashboard(response.name, response.role);
};

const loadDashboard = async (name, role) => {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  welcomeTitle.textContent = `Welcome, ${name}`;
  roleSubtitle.textContent = "Role-based dashboard overview";
  rolePill.textContent = role.toUpperCase();

  const [profile, attendance, notes, transport, timetable, exams, notices, website] = await Promise.all([
    fetchData("/api/me"),
    fetchData("/api/attendance"),
    fetchData("/api/notes"),
    fetchData("/api/transport"),
    fetchData("/api/timetables/school"),
    fetchData("/api/timetables/exams"),
    fetchData("/api/notices"),
    fetchData("/api/website")
  ]);

  renderCards([
    { label: "Role", value: role.toUpperCase() },
    { label: "Attendance Records", value: attendance.length },
    { label: "Study Notes", value: notes.length },
    { label: "Notices", value: notices.length }
  ]);

  renderList(profileContent, [profile.user], (user) => {
    if (role === "student") {
      return `${user.name} | Class ${user.class}${user.division} | Roll No. ${user.rollNumber}`;
    }
    if (role === "teacher") {
      return `${user.name} | Subjects: ${user.subjects.join(", ")} | Classes: ${user.classes.join(", ")}`;
    }
    return `${user.name} | Principal & System Admin`;
  });

  renderList(attendanceContent, attendance, (record) => {
    return `${record.date} - ${record.student} (${record.class}): ${record.status}`;
  });

  renderList(notesContent, notes, (note) => {
    return `${note.title} (${note.subject}) - ${note.class} | ${note.date}`;
  });

  renderList(transportContent, transport, (route) => {
    return `${route.route} | Stops: ${route.stops.join(", ")} | ${route.time}`;
  });

  renderList(noticesContent, notices, (notice) => {
    return `${notice.title} (${notice.date}) - ${notice.content}`;
  });

  renderList(websiteContent, website, (section) => {
    return `${section.title}: ${section.content}`;
  });

  if (role === "student") {
    behaviorContent.innerHTML = "Student behavior notes are visible only to teachers and principals.";
  }

  if (role === "teacher") {
    const behavior = await fetchData("/api/behavior/students");
    renderList(behaviorContent, behavior, (note) => `${note.student}: ${note.note} (${note.date})`);
  }

  if (role === "principal") {
    const [studentNotes, teacherNotes, leaveApps] = await Promise.all([
      fetchData("/api/behavior/students"),
      fetchData("/api/behavior/teachers"),
      fetchData("/api/leave-applications")
    ]);
    const combined = [
      ...studentNotes.map((note) => `${note.student}: ${note.note} (${note.author})`),
      ...teacherNotes.map((note) => `${note.teacher}: ${note.note} (${note.author})`),
      ...leaveApps.map((leave) => `Leave: ${leave.student} | ${leave.date} | ${leave.status}`)
    ];
    renderList(behaviorContent, combined, (item) => item);
  }

  const combinedTimetables = [
    ...timetable.map((slot) => `${slot.day} ${slot.class}: ${slot.periods.join(" · ")}`),
    ...exams.map((exam) => `${exam.exam} ${exam.subject} - ${exam.date}`)
  ];
  renderList(timetableContent, combinedTimetables, (item) => item);
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username");
  const password = formData.get("password");

  try {
    await login(username, password);
  } catch (error) {
    alert("Login failed. Check credentials and try again.");
  }
});

logoutBtn.addEventListener("click", () => {
  authToken = null;
  currentRole = null;
  loginPanel.classList.remove("hidden");
  dashboardPanel.classList.add("hidden");
  logoutBtn.classList.add("hidden");
});

if (!currentRole) {
  dashboardPanel.classList.add("hidden");
}
