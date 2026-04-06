import mongoose from 'mongoose';
import 'dotenv/config';

await mongoose.connect(process.env.MONGODB_URI);
const user = await mongoose.connection.collection('users').findOne({ role: 'admin' });
console.log(user ? user.email : "No admin found");
process.exit(0);
