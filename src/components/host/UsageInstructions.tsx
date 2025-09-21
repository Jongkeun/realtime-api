export default function UsageInstructions() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-blue-800 font-semibold mb-2">🔍 사용 방법</h3>
      <ol className="text-blue-700 text-sm space-y-1">
        <li>1. &quot;호스트 시작하기&quot; 버튼을 클릭하여 시스템을 초기화합니다</li>
        <li>2. 생성된 방 코드를 아이에게 알려주세요</li>
        <li>3. 아이가 게스트로 접속하면 자동으로 연결됩니다</li>
        <li>4. 연결이 완료되면 아이와 AI의 실시간 대화가 시작됩니다</li>
      </ol>
    </div>
  );
}