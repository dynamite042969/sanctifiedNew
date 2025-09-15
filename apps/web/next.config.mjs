import { IgnorePlugin } from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sanctified/ui'],
  webpack: (config, { isServer }) => {
    // let Next resolve RN web files if you use .web.* filenames
    config.resolve.extensions.push('.web.js', '.web.ts', '.web.tsx');

    // use react-native-web on the web
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native': 'react-native-web',
    };

    // ignore .native files
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /\.native\.(ts|tsx)$/,
      })
    );

    return config;
  },
};

export default nextConfig;
