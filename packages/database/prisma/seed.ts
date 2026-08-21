import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
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

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin',
      description: 'Administrative access',
      isBuiltIn: true,
    },
  });

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
    // Consent-only audience export. This is intentionally separate from
    // patient read access because it exposes contacts outside the clinic.
    { code: 'marketing:export', category: 'marketing' },
    // Clinical history permissions
    { code: 'clinical_record:read', category: 'clinical_record' },
    { code: 'clinical_record:create', category: 'clinical_record' },
    { code: 'clinical_record:update', category: 'clinical_record' },
    // Appointment placeholder (for future)
    { code: 'appointment:read', category: 'appointment' },
    { code: 'appointment:create', category: 'appointment' },
    { code: 'appointment:update', category: 'appointment' },
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

  // Assign permissions to built-in roles. These assignments are idempotent so
  // re-running the development seed safely repairs missing role permissions.
  const allPermissions = await prisma.permission.findMany();
  const permissionsByCode = new Map(allPermissions.map((permission) => [permission.code, permission]));
  const assignPermissions = async (roleId: string, codes: string[]) => {
    for (const code of codes) {
      const permission = permissionsByCode.get(code);
      if (!permission) throw new Error(`Seed permission not found: ${code}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
    }
  };

  await assignPermissions(ownerRole.id, allPermissions.map((permission) => permission.code));
  await assignPermissions(adminRole.id, allPermissions.map((permission) => permission.code));
  await assignPermissions(doctorRole.id, [
    'patient:read', 'patient:create', 'patient:update',
    'clinical_record:read', 'clinical_record:create', 'clinical_record:update',
    'appointment:read', 'appointment:create', 'appointment:update',
  ]);
  await assignPermissions(receptionistRole.id, ['patient:read', 'patient:create', 'appointment:read', 'appointment:create', 'appointment:update']);

  console.log(`✓ Permissions assigned to built-in roles`);

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
