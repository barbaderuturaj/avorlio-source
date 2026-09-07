const raw = process.env.DATABASE_URL || "";
if (!raw) {
  console.log("DATABASE_URL_MISSING");
  process.exit(0);
}

const u = new URL(raw);

console.log(JSON.stringify({
  host: u.hostname,
  port: u.port || null,
  database: u.pathname.replace(/^\//, "")
}, null, 2));
