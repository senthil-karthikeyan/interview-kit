/**
 * InterviewKit — Netlify Dynamic Redirects Generator
 *
 * Netlify configuration files (netlify.toml) do not natively interpolate
 * runtime environment variables in redirect destinations.
 *
 * This script runs at build time before Vite packages the application.
 * It reads the backend URL from the environment (BACKEND_URL or VITE_API_URL)
 * and generates public/_redirects (which Vite copies to dist/_redirects)
 * to proxy /api/* requests directly to your deployed backend.
 */
const fs = require('fs');
const path = require('path');

// Helper to parse key=value lines from .env files if not already in process.env
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        result[key] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

// 1. Resolve environment variables: check process.env first, then local/root .env
const localEnv = loadEnvFile(path.resolve(__dirname, '../.env'));
const rootEnv = loadEnvFile(path.resolve(__dirname, '../../../.env'));

const rawBackendUrl =
  process.env.BACKEND_URL ||
  process.env.VITE_API_URL ||
  localEnv.BACKEND_URL ||
  localEnv.VITE_API_URL ||
  rootEnv.BACKEND_URL ||
  rootEnv.VITE_API_URL ||
  '';

const backendUrl = rawBackendUrl
  .trim()
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

const publicDir = path.resolve(__dirname, '../public');
const distDir = path.resolve(__dirname, '../dist');

let redirectsContent = '';

if (backendUrl) {
  console.log(`[generate-redirects] Configuring API proxy redirect to: ${backendUrl}`);
  redirectsContent = [
    `# ══════════════════════════════════════════════════════════════════════════════`,
    `# InterviewKit — Netlify Proxy Redirects (Generated from environment variable)`,
    `# ══════════════════════════════════════════════════════════════════════════════`,
    ``,
    `# Proxy all /api requests to the deployed backend`,
    `/api/*  ${backendUrl}/api/:splat  200!`,
    ``,
    `# SPA client-side routing fallback`,
    `/*      /index.html               200`,
    ``,
  ].join('\n');
} else {
  console.log(
    `[generate-redirects] Note: No BACKEND_URL or VITE_API_URL detected in environment.\n` +
      `                     Configuring default SPA routing. To proxy /api requests,\n` +
      `                     set BACKEND_URL in Netlify Site settings > Environment variables.`
  );
  redirectsContent = [
    `# ══════════════════════════════════════════════════════════════════════════════`,
    `# InterviewKit — Netlify Redirects (SPA Fallback)`,
    `# ══════════════════════════════════════════════════════════════════════════════`,
    ``,
    `# SPA client-side routing fallback`,
    `/*      /index.html               200`,
    ``,
  ].join('\n');
}

// Ensure public directory exists and write _redirects
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicRedirectsPath = path.join(publicDir, '_redirects');
fs.writeFileSync(publicRedirectsPath, redirectsContent, 'utf8');
console.log(`[generate-redirects] Written: ${publicRedirectsPath}`);

// If dist directory already exists, also write directly to dist/_redirects
if (fs.existsSync(distDir)) {
  const distRedirectsPath = path.join(distDir, '_redirects');
  fs.writeFileSync(distRedirectsPath, redirectsContent, 'utf8');
  console.log(`[generate-redirects] Written: ${distRedirectsPath}`);
}
