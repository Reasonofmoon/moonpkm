import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 파일 시스템 접근을 위한 서버 설정
  serverExternalPackages: ['gray-matter', 'minisearch'],
};

export default nextConfig;
