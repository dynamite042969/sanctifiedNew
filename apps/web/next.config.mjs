/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sanctified/ui'],
  webpack: (config) => {
    // let Next resolve RN web files if you use .web.* filenames
    config.resolve.extensions.push('.web.js', '.web.ts', '.web.tsx');

    // use react-native-web on the web
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native
};

export default nextConfig;
: 'react-native-web',
    };

    // ignore .native files
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /\.native\.(ts|tsx)$/,
      })
    );

    return config;
  },
};

export default nextConfig;
