/**
 * Seeds the 10 default expense types and the first owner PIN.
 *   SEED_OWNER_PIN=123456 npm run db:seed
 * Add SEED_SAMPLE_DATA=1 to also create sample vehicles, drivers and trips for trying the app.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();
const TYPES = ["Diesel", "Toll", "Driver Bata", "Food", "Loading/Unloading", "Parking", "Repair", "Police/RTO", "Tyre", "Other"];

async function main() {
  for (const name of TYPES) {
    await db.expenseType.upsert({ where: { nameKey: name.toLowerCase() }, update: {}, create: { name, nameKey: name.toLowerCase() } });
  }
  console.log(`Expense types: ${TYPES.length} ensured.`);

  if ((await db.user.count()) === 0) {
    const pin = process.env.SEED_OWNER_PIN;
    if (!pin || !/^\d{6}$/.test(pin)) throw new Error("No PIN exists yet. Set SEED_OWNER_PIN to a 6-digit PIN and run the seed again.");
    await db.user.create({ data: { name: "Owner", pinHash: await hash(pin) } });
    console.log("Owner PIN created.");
  } else {
    console.log("PINs already exist; none added.");
  }

  if (process.env.SEED_SAMPLE_DATA === "1" && (await db.trip.count()) === 0) await sample();
}

async function sample() {
  const vehicles = await Promise.all(
    [
      ["KL07AB1234", "Big Blue", "12-wheeler"],
      ["KL07CD5521", null, "10-wheeler"],
      ["KL08EF7710", "Highway King", "14-wheeler"],
      ["KL10GH3302", null, "10-wheeler"],
      ["KL07JK8890", null, "12-wheeler"],
    ].map(([number, name, type]) => db.vehicle.upsert({ where: { number: number! }, update: {}, create: { number: number!, name, type } })),
  );
  const drivers = await Promise.all(["Ravi", "Suresh", "Manoj", "Biju", "Anil"].map((name) => db.driver.create({ data: { name } })));
  const types = Object.fromEntries((await db.expenseType.findMany()).map((t) => [t.name, t.id]));
  const routes = ["Kochi – Coimbatore", "Ernakulam – Salem", "Kochi – Madurai", "Thrissur – Bengaluru", "Aluva – Trichy", "Kochi – Chennai", "Palakkad – Erode", "Kochi – Mangaluru"];
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()) + "T00:00:00Z");
  let n = 0;
  for (let d = 0; d < 28; d++) {
    const date = new Date(today.getTime() - d * 86_400_000);
    for (let k = 0; k < 2; k++, n++) {
      const v = vehicles[n % vehicles.length];
      const drv = drivers[(n + d) % drivers.length];
      const earned = (12_000 + ((n * 3779) % 30_000)) * 100;
      const diesel = Math.round((earned * 0.32) / 10_000) * 10_000;
      const isCredit = n % 4 === 1;
      const paid = isCredit && d > 6 && n % 8 === 1;
      await db.trip.create({
        data: {
          tripDate: date,
          name: routes[n % routes.length],
          vehicleId: v.id,
          driverId: drv.id,
          amountEarnedPaise: earned,
          isCredit,
          creditPaidOn: paid ? new Date(date.getTime() + 5 * 86_400_000) : null,
          expenses: {
            create: [
              { expenseTypeId: types["Diesel"], amountPaise: diesel },
              { expenseTypeId: types["Toll"], amountPaise: 80_000 + (n % 5) * 20_000 },
              ...(n % 3 === 0 ? [{ expenseTypeId: types["Driver Bata"], amountPaise: 60_000 }] : []),
              ...(n % 11 === 0 ? [{ expenseTypeId: types["Repair"], amountPaise: 320_000 }] : []),
            ],
          },
        },
      });
    }
  }
  console.log(`Sample data: ${vehicles.length} vehicles, ${drivers.length} drivers, ${n} trips.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
