const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..");
const frontendVercelConfigPath = path.join(workspaceRoot, "frontend", "vercel.json");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, ".env.local"));

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_BASE_URL ||
  "";

const errors = [];

if (!apiUrl) {
  errors.push("NEXT_PUBLIC_API_URL (or API_BASE_URL/BACKEND_BASE_URL) is required.");
} else if (/YOUR_BACKEND_URL/i.test(apiUrl)) {
  errors.push("NEXT_PUBLIC_API_URL must not contain placeholder values.");
}

if (fs.existsSync(frontendVercelConfigPath)) {
  try {
    const raw = fs.readFileSync(frontendVercelConfigPath, "utf-8");
    const config = JSON.parse(raw);
    const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];

    for (const rewrite of rewrites) {
      const destination = String((rewrite && rewrite.destination) || "");
      if (/YOUR_BACKEND_URL/i.test(destination)) {
        errors.push("frontend/vercel.json contains a placeholder rewrite destination.");
      }
    }
  } catch (error) {
    errors.push(`Unable to parse frontend/vercel.json: ${String(error)}`);
  }
}

if (errors.length > 0) {
  console.error("Deployment preflight checks failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Deployment preflight checks passed.");
