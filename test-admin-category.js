import mongoose from 'mongoose';
import 'dotenv/config';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.connection.collection('users').findOne({ role: 'admin' });
  console.log("Admin user:", user ? user.email : "Not found");
  process.exit(0);
}
test();
