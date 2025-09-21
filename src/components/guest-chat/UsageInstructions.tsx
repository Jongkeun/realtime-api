export default function UsageInstructions() {
  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
        <span className="mr-2">💡</span>
        어떻게 사용하나요?
      </h3>
      <div className="space-y-2 text-gray-700">
        <p className="flex items-start">
          <span className="mr-2">1️⃣</span>
          <span>마이크에 대고 자연스럽게 말해보세요</span>
        </p>
        <p className="flex items-start">
          <span className="mr-2">2️⃣</span>
          <span>AI 친구가 여러분의 말을 듣고 대답해줄 거예요</span>
        </p>
        <p className="flex items-start">
          <span className="mr-2">3️⃣</span>
          <span>대화를 계속 이어나가며 재미있게 놀아요!</span>
        </p>
      </div>
    </div>
  );
}