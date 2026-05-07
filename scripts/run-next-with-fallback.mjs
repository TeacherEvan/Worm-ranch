import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const VALID_MODES = new Set(["dev", "start"]);
const MAX_PORT_ATTEMPTS = 25;

const [, , modeArg = "dev", ...rawArgs] = process.argv;

if (!VALID_MODES.has(modeArg)) {
  console.error(`Unsupported Next.js mode: ${modeArg}`);
  process.exit(1);
}

const { forwardedArgs, preferredPort } = extractPreferredPort(rawArgs, process.env.PORT);
const startPort = preferredPort ?? 3000;
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

const port = await findAvailablePort(startPort, MAX_PORT_ATTEMPTS);

if (port === null) {
  console.error(`No open port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}.`);
  process.exit(1);
}

if (port !== startPort) {
  console.warn(`Port ${startPort} is busy, falling back to ${port}.`);
} else {
  console.log(`Using port ${port}.`);
}

const child = spawn(process.execPath, [nextBin, modeArg, "--port", String(port), ...forwardedArgs], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

function extractPreferredPort(args, envPort) {
  const forwardedArgs = [];
  let preferredPort = parsePort(envPort);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" || arg === "-p") {
      preferredPort = parsePort(args[index + 1]) ?? preferredPort;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--port=")) {
      preferredPort = parsePort(arg.slice("--port=".length)) ?? preferredPort;
      continue;
    }

    forwardedArgs.push(arg);
  }

  return { forwardedArgs, preferredPort };
}

function parsePort(value) {
  if (!value) {
    return null;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }

  return port;
}

async function findAvailablePort(startPort, maxAttempts) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}