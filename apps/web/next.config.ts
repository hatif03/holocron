/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@holocron/shared"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/research-graph",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
