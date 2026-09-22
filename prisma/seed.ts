import { PrismaClient, UserRole, LeadStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { name: "Jadibuti" },
      update: {},
      create: { name: "Jadibuti", location: "Jadibuti, Kathmandu" },
    }),
    prisma.branch.upsert({
      where: { name: "Kalanki" },
      update: {},
      create: { name: "Kalanki", location: "Kalanki, Kathmandu" },
    }),
    prisma.branch.upsert({
      where: { name: "Butwal" },
      update: {},
      create: { name: "Butwal", location: "Butwal, Rupandehi" },
    }),
  ]);

  console.log("✓ Branches created");

  // Lead Sources
  const sources = [
    "Instagram", "Facebook", "WhatsApp", "TikTok", "Website",
    "Referral", "Walk-in", "Phone Call", "Education Fair",
    "Google", "Existing Student", "Friend/Family", "Other",
  ];
  const createdSources = await Promise.all(
    sources.map((name, i) =>
      prisma.leadSource.upsert({
        where: { name },
        update: {},
        create: { name, order: i },
      })
    )
  );

  console.log("✓ Lead sources created");

  // Countries
  const countries = [
    { name: "Canada", code: "CA" },
    { name: "UK", code: "GB" },
    { name: "Australia", code: "AU" },
    { name: "USA", code: "US" },
    { name: "South Korea", code: "KR" },
    { name: "Japan", code: "JP" },
    { name: "New Zealand", code: "NZ" },
    { name: "Germany", code: "DE" },
    { name: "Finland", code: "FI" },
    { name: "Denmark", code: "DK" },
    { name: "Other", code: null },
  ];
  const createdCountries = await Promise.all(
    countries.map((c, i) =>
      prisma.country.upsert({
        where: { name: c.name },
        update: {},
        create: { name: c.name, code: c.code, order: i },
      })
    )
  );

  console.log("✓ Countries created");

  // Intakes
  const intakes = [
    { name: "Jan 2027", year: 2027, month: 1 },
    { name: "Feb 2027", year: 2027, month: 2 },
    { name: "Mar 2027", year: 2027, month: 3 },
    { name: "May 2027", year: 2027, month: 5 },
    { name: "Sep 2027", year: 2027, month: 9 },
    { name: "Oct 2027", year: 2027, month: 10 },
    { name: "Other", year: null, month: null },
  ];
  const createdIntakes = await Promise.all(
    intakes.map((intake, i) =>
      prisma.intake.upsert({
        where: { name: intake.name },
        update: {},
        create: { ...intake, order: i },
      })
    )
  );

  console.log("✓ Intakes created");

  // Admin user
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@globalgate.edu" },
    update: {},
    create: {
      email: "admin@globalgate.edu",
      password: adminPassword,
      name: "Admin User",
      role: UserRole.ADMIN,
      branchId: branches[0].id,
    },
  });

  console.log("✓ Admin created — admin@globalgate.edu / Admin@123456");

  // Counsellors
  const counsellorData = [
    { name: "Priya Sharma", email: "priya@globalgate.edu", branchId: branches[0].id },
    { name: "Rohan Thapa", email: "rohan@globalgate.edu", branchId: branches[0].id },
    { name: "Sunita Rai", email: "sunita@globalgate.edu", branchId: branches[1].id },
    { name: "Bikash Gurung", email: "bikash@globalgate.edu", branchId: branches[1].id },
    { name: "Anjali Magar", email: "anjali@globalgate.edu", branchId: branches[2].id },
  ];

  const counsellors = await Promise.all(
    counsellorData.map(async (c) => {
      const pw = await bcrypt.hash("Counsellor@123456", 12);
      return prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: { ...c, password: pw, role: UserRole.COUNSELLOR },
      });
    })
  );

  console.log("✓ Counsellors created — password: Counsellor@123456");

  // Receptionist
  const receptionPw = await bcrypt.hash("Reception@123456", 12);
  await prisma.user.upsert({
    where: { email: "reception@globalgate.edu" },
    update: {},
    create: {
      email: "reception@globalgate.edu",
      password: receptionPw,
      name: "Front Desk",
      role: UserRole.RECEPTIONIST,
      branchId: branches[0].id,
    },
  });

  console.log("✓ Receptionist created — reception@globalgate.edu / Reception@123456");

  // Helper to get sequential lead ID
  let leadCounter = 1;
  const nextLeadId = () => `GG-2026-${String(leadCounter++).padStart(5, "0")}`;

  // Sample leads (fake data)
  const sampleLeads = [
    {
      studentName: "Aarav Poudel", phone: "9841100001", email: "aarav.p@email.com",
      educationLevel: "Bachelor's", status: LeadStatus.NEW,
      countryId: createdCountries[0].id, sourceId: createdSources[0].id,
      intakeId: createdIntakes[4].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[0].id,
    },
    {
      studentName: "Sita Tamang", phone: "9841100002",
      educationLevel: "Master's", status: LeadStatus.CONTACTED,
      countryId: createdCountries[1].id, sourceId: createdSources[1].id,
      intakeId: createdIntakes[3].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[0].id,
    },
    {
      studentName: "Bimal Karki", phone: "9841100003", email: "bimal.k@email.com",
      educationLevel: "+2/High School", status: LeadStatus.FOLLOW_UP,
      countryId: createdCountries[2].id, sourceId: createdSources[6].id,
      intakeId: createdIntakes[4].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[1].id,
      nextFollowUpAt: new Date(Date.now() + 86400000),
    },
    {
      studentName: "Kamala Shrestha", phone: "9841100004",
      educationLevel: "Bachelor's", status: LeadStatus.COUNSELLING_BOOKED,
      countryId: createdCountries[3].id, sourceId: createdSources[5].id,
      intakeId: createdIntakes[0].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[2].id,
    },
    {
      studentName: "Deepak Adhikari", phone: "9841100005", email: "deepak.a@email.com",
      educationLevel: "Master's", status: LeadStatus.COUNSELLING_COMPLETED,
      countryId: createdCountries[0].id, sourceId: createdSources[8].id,
      intakeId: createdIntakes[1].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[3].id,
    },
    {
      studentName: "Rima Bajracharya", phone: "9841100006",
      educationLevel: "Diploma", status: LeadStatus.DOCUMENT_COLLECTION,
      countryId: createdCountries[4].id, sourceId: createdSources[3].id,
      intakeId: createdIntakes[2].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[2].id,
    },
    {
      studentName: "Suresh Limbu", phone: "9841100007", email: "suresh.l@email.com",
      educationLevel: "Bachelor's", status: LeadStatus.APPLICATION_STARTED,
      countryId: createdCountries[1].id, sourceId: createdSources[9].id,
      intakeId: createdIntakes[3].id, branchId: branches[2].id,
      assignedCounsellorId: counsellors[4].id,
    },
    {
      studentName: "Mina Gharti", phone: "9841100008",
      educationLevel: "+2/High School", status: LeadStatus.APPLICATION_SUBMITTED,
      countryId: createdCountries[6].id, sourceId: createdSources[0].id,
      intakeId: createdIntakes[4].id, branchId: branches[2].id,
      assignedCounsellorId: counsellors[4].id,
    },
    {
      studentName: "Prakash Neupane", phone: "9841100009", email: "prakash.n@email.com",
      educationLevel: "Master's", status: LeadStatus.OFFER_RECEIVED,
      countryId: createdCountries[2].id, sourceId: createdSources[4].id,
      intakeId: createdIntakes[0].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[0].id,
    },
    {
      studentName: "Anita Dhakal", phone: "9841100010",
      educationLevel: "Bachelor's", status: LeadStatus.VISA_PROCESS,
      countryId: createdCountries[0].id, sourceId: createdSources[10].id,
      intakeId: createdIntakes[1].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[1].id,
    },
    {
      studentName: "Rajesh Bogati", phone: "9841100011", email: "rajesh.b@email.com",
      educationLevel: "Language Course", status: LeadStatus.VISA_GRANTED,
      countryId: createdCountries[4].id, sourceId: createdSources[11].id,
      intakeId: createdIntakes[2].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[2].id,
    },
    {
      studentName: "Sabina Rana", phone: "9841100012",
      educationLevel: "Bachelor's", status: LeadStatus.ENROLLED,
      countryId: createdCountries[1].id, sourceId: createdSources[5].id,
      intakeId: createdIntakes[4].id, branchId: branches[2].id,
      assignedCounsellorId: counsellors[4].id,
    },
    {
      studentName: "Nabin Koirala", phone: "9841100013", email: "nabin.k@email.com",
      educationLevel: "Master's", status: LeadStatus.NOT_INTERESTED,
      countryId: createdCountries[3].id, sourceId: createdSources[7].id,
      intakeId: createdIntakes[5].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[0].id,
    },
    {
      studentName: "Puja Pandey", phone: "9841100014",
      educationLevel: "+2/High School", status: LeadStatus.FUTURE_INTAKE,
      countryId: createdCountries[7].id, sourceId: createdSources[2].id,
      intakeId: createdIntakes[6].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[1].id,
      nextFollowUpAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      studentName: "Dinesh Khatri", phone: "9841100015", email: "dinesh.k@email.com",
      educationLevel: "Diploma", status: LeadStatus.NEW,
      countryId: createdCountries[5].id, sourceId: createdSources[0].id,
      intakeId: createdIntakes[3].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[3].id,
    },
    {
      studentName: "Rekha Joshi", phone: "9841100016",
      educationLevel: "Bachelor's", status: LeadStatus.CONTACTED,
      countryId: createdCountries[8].id, sourceId: createdSources[1].id,
      intakeId: createdIntakes[4].id, branchId: branches[2].id,
      assignedCounsellorId: counsellors[4].id,
    },
    {
      studentName: "Gaurav Bista", phone: "9841100017", email: "gaurav.b@email.com",
      educationLevel: "Master's", status: LeadStatus.INTERESTED,
      countryId: createdCountries[0].id, sourceId: createdSources[8].id,
      intakeId: createdIntakes[0].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[0].id,
      nextFollowUpAt: new Date(),
    },
    {
      studentName: "Manisha Oli", phone: "9841100018",
      educationLevel: "+2/High School", status: LeadStatus.NEW,
      countryId: createdCountries[2].id, sourceId: createdSources[3].id,
      intakeId: createdIntakes[5].id, branchId: branches[1].id,
      assignedCounsellorId: counsellors[2].id,
    },
    {
      studentName: "Santosh Aryal", phone: "9841100019", email: "santosh.a@email.com",
      educationLevel: "Bachelor's", status: LeadStatus.FOLLOW_UP,
      countryId: createdCountries[9].id, sourceId: createdSources[6].id,
      intakeId: createdIntakes[2].id, branchId: branches[2].id,
      assignedCounsellorId: counsellors[4].id,
      nextFollowUpAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      studentName: "Hira Tamang", phone: "9841100020",
      educationLevel: "Diploma", status: LeadStatus.APPLICATION_STARTED,
      countryId: createdCountries[6].id, sourceId: createdSources[4].id,
      intakeId: createdIntakes[1].id, branchId: branches[0].id,
      assignedCounsellorId: counsellors[1].id,
    },
  ];

  for (const lead of sampleLeads) {
    const existing = await prisma.lead.findFirst({ where: { phone: lead.phone } });
    if (!existing) {
      const created = await prisma.lead.create({
        data: { ...lead, leadId: nextLeadId(), createdById: admin.id },
      });
      await prisma.leadActivity.create({
        data: {
          leadId: created.id,
          userId: admin.id,
          action: "CREATE_LEAD",
          metadata: { note: "Seeded lead" },
        },
      });
    }
  }

  console.log("✓ Sample leads created");
  console.log("\nSeed complete!");
  console.log("Admin:        admin@globalgate.edu / Admin@123456");
  console.log("Counsellors:  priya@globalgate.edu, rohan@globalgate.edu, ... / Counsellor@123456");
  console.log("Receptionist: reception@globalgate.edu / Reception@123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
