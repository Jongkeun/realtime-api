import Link from "next/link";

export default function Navigation() {
  return (
    <div className="mt-6 text-center">
      <Link href="/" className="text-purple-600 hover:text-purple-800 text-sm underline">
        ← 메인 페이지로 돌아가기
      </Link>
    </div>
  );
}