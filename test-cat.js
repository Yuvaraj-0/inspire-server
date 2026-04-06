import 'dotenv/config';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: '654321' }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '1h' });

async function run() {
  const res = await fetch('http://localhost:3001/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'test-category' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run();
