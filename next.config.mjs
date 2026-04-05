import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.159.1", "localhost", "127.0.0.1"],
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
