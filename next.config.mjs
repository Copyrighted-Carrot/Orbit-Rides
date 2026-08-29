/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    // eslint: {
    //     ignoreDuringBuilds: true,
    // },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.daisyui.com',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'mcjjplnltatdmcuffhhf.supabase.co',
                port: '',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                port: '',
            },
        ],
    },
};

export default nextConfig;
