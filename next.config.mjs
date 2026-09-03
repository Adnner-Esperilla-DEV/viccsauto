/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const csp = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"].join("; ");
const nextConfig = { experimental: { serverActions: { bodySizeLimit: "2mb" } }, async headers() { return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] }]; } };

export default nextConfig;
