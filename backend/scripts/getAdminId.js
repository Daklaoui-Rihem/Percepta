const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const users = await User.find({}).select('_id email role').lean();
    users.forEach(u => console.log(`${u.role || 'user'} | ${u.email} | ${u._id}`));
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => {
    console.error('DB Error:', e.message);
    process.exit(1);
});
