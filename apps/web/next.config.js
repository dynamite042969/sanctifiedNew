const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // This is only needed for the server-side build
    if (isServer) {
      // The path to the data directory of pdfkit
      // This might vary based on your package manager (npm, yarn, pnpm)
      // and project structure.
      // `require.resolve` is a good way to find the package.
      const pdfkitDataDir = path.join(
        path.dirname(require.resolve('pdfkit/package.json')),
        'js/data'
      );

      // The error indicates the file is expected in `.next/server/vendor-chunks/data`
      // We'll copy the entire data directory there.
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            // The error indicates the file is expected in `.next/server/vendor-chunks/data`
            { from: pdfkitDataDir, to: 'vendor-chunks/data' },
          ],
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
