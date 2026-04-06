import 'dotenv/config';

(async () => {
try {
  const r1 = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  const data = await r1.json();
  if (!data.token) { console.log('Login failed', data); process.exit(1); }

  const res = await fetch('http://localhost:3001/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
    body: JSON.stringify({ name: 'shoes' })
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
} catch(e) { console.error(e) }
})();
