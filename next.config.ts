import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview URL origin so Next.js doesn't treat HMR client
  // connections and same-origin API requests as cross-origin. Without
  // this, Chrome on the HTTPS preview URL sometimes refuses to send
  // the session cookie on API requests because it sees them as cross-
  // origin (preview-chat-*.space-z.ai vs localhost:3000).
  allowedDevOrigins: [
    "*.space-z.ai",
    "preview-chat-*.space-z.ai",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
