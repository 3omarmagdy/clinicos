import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create development organization
  const org = await prisma.organization.upsert({
    where: { slug: 'dev-clinic' },
    update: {},
    create: {
      name: 'Development Clinic',
      slug: 'dev-clinic',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
    },
  });

  console.log(`✓ Organization created: ${org.name}`);

  // Create development location
  const location = await prisma.location.upsert({
    where: { organizationId_id: { organizationId: org.id, id: 'dev-location' } },
    update: {},
    create: {
      id: 'dev-location',
      organizationId: org.id,
      name: 'Main Clinic',
      address: '123 Medical Street, Cairo',
      phone: '+20123456789',
      email: 'clinic@dev.local',
      timezone: 'Africa/Cairo',
      status: 'active',
    },
  });

  console.log(`✓ Location created: ${location.name}`);

  // Create development department
  const department = await prisma.department.upsert({
    where: { organizationId_locationId_id: { organizationId: org.id, locationId: location.id, id: 'dev-department' } },
    update: {},
    create: {
      id: 'dev-department',
      organizationId: org.id,
      locationId: location.id,
      name: 'General Practice',
      specialtyModule: 'general',
      status: 'active',
    },
  });

  console.log(`✓ Department created: ${department.name}`);

  // Create built-in roles
  const ownerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Owner' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Owner',
      description: 'Full system access',
      isBuiltIn: true,
    },
  });

  void (await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin',
      description: 'Administrative access',
      isBuiltIn: true,
    },
  }));

  const doctorRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Doctor' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Doctor',
      description: 'Doctor access',
      isBuiltIn: true,
    },
  });

  const receptionistRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Receptionist' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Receptionist',
      description: 'Reception staff access',
      isBuiltIn: true,
    },
  });

  console.log(`✓ Built-in roles created`);

  // Create foundational permissions
  const permissionCodes = [
    // Organization permissions
    { code: 'organization:read', category: 'organization' },
    { code: 'organization:update', category: 'organization' },
    // User permissions
    { code: 'user:create', category: 'user' },
    { code: 'user:read', category: 'user' },
    { code: 'user:update', category: 'user' },
    { code: 'user:delete', category: 'user' },
    // Patient placeholder (for future)
    { code: 'patient:read', category: 'patient' },
    { code: 'patient:create', category: 'patient' },
    { code: 'patient:update', category: 'patient' },
    // Appointment placeholder (for future)
    { code: 'appointment:read', category: 'appointment' },
    { code: 'appointment:create', category: 'appointment' },
  ];

  for (const perm of permissionCodes) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: {
        code: perm.code,
        category: perm.category,
      },
    });
  }

  console.log(`✓ Permissions created`);

  // Assign permissions to owner role (all permissions)
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log(`✓ Permissions assigned to Owner role`);

  // Create development users
  const passwordHash = await bcrypt.hash('dev_password_123', 12);

  const ownerUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'owner@dev.local' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'owner@dev.local',
      passwordHash,
      firstName: 'Dev',
      lastName: 'Owner',
      role: 'owner',
      status: 'active',
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'doctor@dev.local' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'doctor@dev.local',
      passwordHash,
      firstName: 'Dr',
      lastName: 'Ahmed',
      role: 'doctor',
      status: 'active',
    },
  });

  const receptionistUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'receptionist@dev.local' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'receptionist@dev.local',
      passwordHash,
      firstName: 'Fatima',
      lastName: 'Reception',
      role: 'receptionist',
      status: 'active',
    },
  });

  console.log(`✓ Development users created`);

  // Assign roles to users
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRole.id } },
    update: {},
    create: {
      userId: ownerUser.id,
      roleId: ownerRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: doctorUser.id, roleId: doctorRole.id } },
    update: {},
    create: {
      userId: doctorUser.id,
      roleId: doctorRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: receptionistUser.id, roleId: receptionistRole.id } },
    update: {},
    create: {
      userId: receptionistUser.id,
      roleId: receptionistRole.id,
    },
  });

  console.log(`✓ User roles assigned`);

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Development Credentials:');
  console.log(`  Owner: owner@dev.local / dev_password_123`);
  console.log(`  Doctor: doctor@dev.local / dev_password_123`);
  console.log(`  Receptionist: receptionist@dev.local / dev_password_123`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
