import type { NextConfig } from "next";

function githubPagesBasePath() {
  if (process.env.GITHUB_PAGES !== "true") {
    return "";
  }
  if (process.env.PAGES_BASE_PATH === "") {
    return "";
  }
  if (process.env.PAGES_BASE_PATH) {
    const value = process.env.PAGES_BASE_PATH;
    return value.startsWith("/") ? value : `/${value}`;
  }
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo || repo.endsWith(".github.io")) {
    return "";
  }
  return `/${repo}`;
}

const basePath = githubPagesBasePath();

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
};

export default nextConfig;
