/**
 * Seed script to create initial admin users
 * 
 * Usage:
 * 1. Set environment variables:
 *    - MONGODB_URI
 *    - ADMIN_JWT_SECRET (optional, for JWT)
 * 
 * 2. Run with ts-node:
 *    npx ts-node src/admin/scripts/seed-admin.ts
 * 
 * Or compile and run:
 *    npm run build
 *    node dist/admin/scripts/seed-admin.js
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';

async function seedAdmins() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminModel = app.get<Model<AdminDocument>>(getModelToken(Admin.name));

  try {
    // Check if admins already exist
    const existingAdmins = await adminModel.countDocuments();
    if (existingAdmins > 0) {
      console.log('Admins already exist. Skipping seed.');
      await app.close();
      return;
    }

    // Default password (should be changed after first login)
    const defaultPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create initial admins
    const admins = [
      {
        adminId: 'ADM-001',
        password: hashedPassword,
        name: 'Admin One',
        role: 'admin',
        isActive: true,
      },
      {
        adminId: 'ADM-002',
        password: hashedPassword,
        name: 'Admin Two',
        role: 'admin',
        isActive: true,
      },
    ];

    await adminModel.insertMany(admins);

    console.log('✅ Admin users seeded successfully!');
    console.log('\nDefault credentials:');
    console.log('Admin ID: ADM-001 or ADM-002');
    console.log('Password: Admin@123');
    console.log('\n⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedAdmins()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
