const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  out: "./drizzle/migrate",
  schema: "./drizzle/schema.js",
  dialect: "mysql",
  dbCredentials: {
    // eslint-disable-next-line no-undef
    url: process.env.DATABASE_URL,
  },
});
