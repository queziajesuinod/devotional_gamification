import "dotenv/config";
import net from "node:net";
import { spawn } from "node:child_process";

const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });

const findAvailablePort = async (startPort, range = 20) => {
  for (let port = startPort; port < startPort + range; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
};

const rawPort = Number.parseInt(process.env.EXPO_PORT || "8081", 10);
const startPort = Number.isFinite(rawPort) ? rawPort : 8081;
const port = await findAvailablePort(startPort);

if (port !== startPort) {
  console.log(`Expo port ${startPort} is busy, using port ${port} instead`);
}

const env = { ...process.env, EXPO_USE_METRO_WORKSPACE_ROOT: "1" };
const child = spawn("npx", ["expo", "start", "--web", "--port", String(port)], {
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
