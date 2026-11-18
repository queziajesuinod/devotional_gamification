import process from "process";

async function loadEnv() {
  try {
    await import("./load-env.js");
  } catch {
    // load-env is optional
  }
}

async function main() {
  await loadEnv();

  const argv = process.argv.slice(2);
  const host = argv[0] || process.env.API_HOST || process.env.APP_URL || process.env.APP_URL_PUBLIC || "http://localhost:3009";
  const rawCookie = argv[1] || process.env.SESSION_COOKIE || process.env.SESSION;

  if (!rawCookie) {
    console.error("Provide a session cookie via argument or SESSION_COOKIE/SESSION env var.");
    process.exit(1);
  }

  const cookieValue = rawCookie.includes("=") ? rawCookie : `session=${rawCookie}`;
  const endpoint = `${host.replace(/\/$/, "")}/api/trpc/medals.checkMedals`;

  console.log(`POST ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieValue,
    },
    body: JSON.stringify({ input: null }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Request failed:", response.status, text);
    process.exit(1);
  }

  try {
    const json = JSON.parse(text);
    const result = json[0]?.result?.data ?? json.result?.data ?? json;
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch {
    console.log("Response:", text);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
