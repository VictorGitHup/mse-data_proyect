/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@supabase/supabase-js', '@supabase/ssr'],
};

module.exports = nextConfig;
