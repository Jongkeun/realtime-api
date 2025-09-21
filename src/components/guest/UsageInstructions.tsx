export default function UsageInstructions() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-blue-800 font-semibold mb-2">🔍 사용 방법</h3>
      <ol className="text-blue-700 text-sm space-y-1">
        <li>1. 위의 방 목록에서 참여하고 싶은 방을 선택하세요</li>
        <li>2. 마이크 권한을 허용해주세요</li>
        <li>3. &quot;방에 참여하기&quot; 버튼을 클릭하세요</li>
        <li>4. 호스트와 연결되면 AI 친구와 대화를 시작할 수 있습니다</li>
      </ol>
    </div>
  );
}