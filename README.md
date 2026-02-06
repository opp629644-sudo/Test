# Sunrise School Management

Secure, role-based school management system with modules for attendance, study material, behavior notes, transport, timetables, and official website content.

## Getting Started

```bash
npm install
npm start
```

Open `http://localhost:3000`.

### Demo Accounts

| Role | Username | Password |
| --- | --- | --- |
| Student | student1 | Welcome@123 |
| Teacher | teacher1 | Welcome@123 |
| Principal | principal | Welcome@123 |

## Security Notes

- JWT-based authentication with role-based authorization middleware.
- File uploads are restricted to common study material formats and limited to 5 MB.
- Update `JWT_SECRET` in production.
