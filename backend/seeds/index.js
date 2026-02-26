require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        const collections = mongoose.connection.collections;
        for (const key in collections) { await collections[key].deleteMany({}); }
        console.log('Cleared existing data.');

        // ===== ADMIN USER ONLY =====
        const password = 'password123';
        const users = await User.create([
            { name: 'Dr. Admin Singh', email: 'admin@hospital.com', password, role: 'admin', phone: '9876543210', department: 'Administration', employeeId: 'EMP-001' },
        ]);
        console.log(`✅ ${users.length} admin user created`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📧 Login Credentials:');
        console.log('  Admin: admin@hospital.com / password123');
        console.log('\n💡 Use Admin Panel to create users for other roles (Doctor, Nurse, etc.)');
        console.log('💡 Add patients, beds, medicines, ambulances, etc. from their respective modules.');

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seed();
