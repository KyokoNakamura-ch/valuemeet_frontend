// Vercel用
/** @type {import('next').NextConfig} */
const nextConfig = {

  eslint: { ignoreDuringBuilds: true },
  // images セクションは未使用なら不要。public配下を使う分には設定なしでOK。
  // 外部ドメインを使うときだけ、下のコメントアウトを外して使う👇
  // images: {
  //   remotePatterns: [
  //     { protocol: 'https', hostname: 'cdn.example.com' },
  //   ],
  //   formats: ['image/avif', 'image/webp'], // 画質そのまま軽量化（任意）
  // },

};

module.exports = nextConfig;


// Azure用
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: 'standalone', // ←これを追加
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   images: {
//     unoptimized: true,
//   },
// };

// module.exports = nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   images: { unoptimized: true },
// };

// module.exports = nextConfig;
