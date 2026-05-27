import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: pkg.version,
  },
};

export default nextConfig;
