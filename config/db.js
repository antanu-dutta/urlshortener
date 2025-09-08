import { drizzle } from "drizzle-orm/mysql2";

// eslint-disable-next-line no-undef
export const db = drizzle(process.env.DATABASE_URL);
// const mysql = require("mysql2/promise");

// async function getDb() {
//   return await mysql.createConnection({
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE_NAME,
//   });
// }

// module.exports = { getDb };
