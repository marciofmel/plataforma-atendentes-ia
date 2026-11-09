const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.findMany().then((r) => console.log(JSON.stringify(r))).catch((e) => console.error(e)).finally(() => p.$disconnect());
