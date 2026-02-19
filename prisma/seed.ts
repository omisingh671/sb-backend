import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/common/utils/password.js";
import { UserRole } from "../src/generated/prisma/client.js";

async function main() {
  /* =========================
     USERS
  ========================= */

  const adminPassword = await hashPassword("Admin@123");
  const managerPassword = await hashPassword("Manager@123");
  const staffPassword = await hashPassword("Staff@123");
  const guestPassword = await hashPassword("Guest@123");

  const seedUsers = async (
    prefix: string,
    count: number,
    role: UserRole,
    passwordHash: string,
  ) => {
    for (let i = 1; i <= count; i++) {
      await prisma.user.upsert({
        where: { email: `${prefix}${i}@sucasa.com` },
        update: {},
        create: {
          fullName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} ${i}`,
          email: `${prefix}${i}@sucasa.com`,
          passwordHash,
          role,
        },
      });
    }
  };

  await seedUsers("admin", 1, UserRole.ADMIN, adminPassword);
  await seedUsers("manager", 2, UserRole.MANAGER, managerPassword);
  await seedUsers("staff", 3, UserRole.STAFF, staffPassword);
  await seedUsers("guest", 5, UserRole.GUEST, guestPassword);

  /* =========================
     PROPERTY
  ========================= */

  await prisma.property.upsert({
    where: {
      name_city_state: {
        name: "SuCasa Homes - Hyderabad",
        city: "Hyderabad",
        state: "Telangana",
      },
    },
    update: {},
    create: {
      name: "SuCasa Homes - Hyderabad",
      address: "Hitech City, Madhapur",
      city: "Hyderabad",
      state: "Telangana",
    },
  });

  /* =========================
     AMENITIES (no relations)
  ========================= */

  const amenitySeed = [
    { name: "Wi-Fi", icon: "FiWifi", isActive: true },
    { name: "Parking", icon: "FiTruck", isActive: true },
    { name: "Power Backup", icon: "FiZap", isActive: true },
    { name: "Kitchen", icon: "FiHome", isActive: true },
    { name: "Washing Machine", icon: "FiRefreshCw", isActive: true },
    { name: "AC", icon: "FiWind", isActive: true },
    { name: "TV", icon: "FiMonitor", isActive: true },
  ];

  for (const item of amenitySeed) {
    await prisma.amenity.upsert({
      where: { name: item.name },
      update: {
        icon: item.icon,
        isActive: item.isActive,
      },
      create: {
        name: item.name,
        icon: item.icon,
        isActive: item.isActive,
      },
    });
  }

  console.log("✅ Minimal seed completed successfully");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
