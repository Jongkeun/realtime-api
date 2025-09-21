interface MicrophonePermissionErrorProps {
  permission: PermissionState | null;
  error: string | null;
  onResetPermission: () => void;
}

export default function MicrophonePermissionError({ 
  permission, 
  error, 
  onResetPermission 
}: MicrophonePermissionErrorProps) {
  if (permission !== "denied" && !error) return null;

  return (
    <>
      {permission === "denied" && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold mb-2">마이크 권한이 필요합니다</h4>
              <p className="text-red-700 text-sm mb-3">음성 채팅을 사용하려면 마이크 접근을 허용해야 합니다.</p>
              <div className="text-red-700 text-sm mb-3">
                <strong>권한 허용 방법:</strong>
                <ol className="mt-1 ml-4 list-decimal">
                  <li>브라우저 주소창 왼쪽의 🔒 (또는 ⚠️) 아이콘 클릭</li>
                  <li>&quot;마이크&quot; 설정을 &quot;허용&quot;으로 변경</li>
                  <li>페이지 새로고침 또는 아래 버튼 클릭</li>
                </ol>
              </div>
              <button
                onClick={onResetPermission}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded border border-red-300"
              >
                권한 다시 요청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}
    </>
  );
}