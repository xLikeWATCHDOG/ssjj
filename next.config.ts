import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  /* config options here */
    experimental: {
        serverActions: {
            allowedOrigins: [
                '192.168.1.250',
                '192.168.1.250:80',
                'localhost',
                'localhost:3000'
            ],
        },
    },
};

export default nextConfig;
