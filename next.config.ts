import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.22'],
  // Sin el indicador "N" de next dev (tapaba el mando en el móvil).
  devIndicators: false,
};
export default nextConfig;
