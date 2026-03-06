import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tauri 데스크톱 앱용 정적 내보내기
  output: 'export',
  // 파일 시스템 접근을 위한 서버 설정
  serverExternalPackages: ['gray-matter', 'minisearch'],
  // 이미지 최적화 비활성화 (정적 export 필수)
  images: { unoptimized: true },
};

export default nextConfig;
