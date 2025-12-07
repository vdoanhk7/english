import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [newWord, setNewWord] = useState("");
  const [history, setHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [isProcessing, setIsProcessing] = useState(false); // Biến để hiện trạng thái đang tải

  const [speechResults, setSpeechResults] = useState({});
  const [isListening, setIsListening] = useState(null);

  // Link API của bạn
  const API_URL = "https://dictation-backend-skto.onrender.com";

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setHistory(res.data);
    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- XỬ LÝ THÊM NHIỀU TỪ CÙNG LÚC ---
  const handleAddWord = async () => {
    if (!newWord.trim()) return;

    // 1. Tách chuỗi nhập vào thành mảng các từ (dựa vào dấu phẩy)
    const wordsToAdd = newWord.split(',').map(w => w.trim()).filter(w => w.length > 0);

    if (wordsToAdd.length === 0) return;

    setIsProcessing(true); // Bật trạng thái đang xử lý

    // 2. Chạy vòng lặp gửi từng từ lên Backend
    for (const word of wordsToAdd) {
      try {
        await axios.post(`${API_URL}/check-word`, { word: word });
      } catch (error) {
        console.error(`Lỗi khi thêm từ: ${word}`, error);
      }
    }

    // 3. Xử lý xong
    setIsProcessing(false); // Tắt trạng thái
    setNewWord(""); // Xóa ô nhập
    fetchHistory(); // Cập nhật lại bảng
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/delete/${id}`);
      fetchHistory();
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const handleListen = (id, targetWord) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ. Hãy dùng Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(id);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setSpeechResults((prev) => ({ ...prev, [id]: transcript }));
      setIsListening(null);
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      setIsListening(null);
      alert("Không nghe rõ, thử lại!");
    };

    recognition.onend = () => {
      setIsListening(null);
    };
  };

  const handleUserType = (id, value) => {
    setUserAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Xử lý khi ấn Enter ở ô nhập
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddWord();
    }
  };

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>English Dictation Master 🎤</h1>

      {/* KHU VỰC THÊM TỪ */}
      <div style={{ marginBottom: "20px", padding: "15px", background: "#f0f8ff", borderRadius: "8px" }}>
        <p style={{margin: '0 0 10px 0', fontSize: '14px', color: '#666'}}>
          💡 Mẹo: Nhập nhiều từ cách nhau bởi dấu phẩy. Ví dụ: <b>apple, banana, orange</b>
        </p>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập từ vựng (ngăn cách bằng dấu phẩy)..."
          style={{ padding: "8px", width: "400px" }}
          disabled={isProcessing} // Khóa ô nhập khi đang chạy
        />
        <button
          onClick={handleAddWord}
          disabled={isProcessing} // Khóa nút khi đang chạy
          style={{
            marginLeft: "10px", padding: "8px 15px", cursor: isProcessing ? "wait" : "pointer",
            background: isProcessing ? "#ccc" : "#007bff", // Đổi màu khi đang chạy
            color: "white", border: "none", borderRadius: "4px",
          }}
        >
          {isProcessing ? "Đang thêm..." : "Thêm đề bài"}
        </button>
      </div>

      {/* BẢNG LUYỆN TẬP */}
      <table border="1" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ backgroundColor: "#343a40", color: "white" }}>
          <tr>
            <th style={{ padding: "10px", width: "50px" }}>STT</th>
            <th style={{ padding: "10px" }}>Điền đáp án</th>
            <th style={{ padding: "10px" }}>Nghe mẫu</th>
            <th style={{ padding: "10px" }}>Luyện nói</th>
            <th style={{ padding: "10px" }}>Gợi ý</th>
            <th style={{ padding: "10px", textAlign: "center" }}>Xóa</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => {
            const userAnswer = userAnswers[item.id] || "";
            const isCorrectType = userAnswer.trim().toLowerCase() === item.word.toLowerCase();
            const spokenWord = speechResults[item.id];
            
            let speakStatus = "Chưa nói";
            let speakColor = "gray";
            if (spokenWord) {
              if (spokenWord === item.word.toLowerCase()) {
                speakStatus = `✅ Chuẩn: "${spokenWord}"`;
                speakColor = "green";
              } else {
                speakStatus = `❌ Sai: "${spokenWord}"`;
                speakColor = "red";
              }
            }

            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{index + 1}</td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => handleUserType(item.id, e.target.value)}
                    placeholder="Nghe và điền..."
                    style={{
                      padding: "8px", width: "150px",
                      border: isCorrectType ? "2px solid green" : "1px solid #ccc",
                      color: isCorrectType ? "green" : "black",
                      backgroundColor: isCorrectType ? "#e8f5e9" : "white"
                    }}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  {item.audio ? <audio controls src={item.audio} style={{ height: "30px", width: "100px" }} /> : "-"}
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => handleListen(item.id, item.word)}
                    style={{
                      cursor: "pointer",
                      background: isListening === item.id ? "red" : "white",
                      color: isListening === item.id ? "white" : "black",
                      border: "1px solid #ccc", borderRadius: "50%", width: "35px", height: "35px",
                    }}
                  >
                    🎤
                  </button>
                  <span style={{ marginLeft: "10px", color: speakColor, fontWeight: "bold" }}>
                    {isListening === item.id ? "Đang nghe..." : speakStatus}
                  </span>
                </td>
                <td style={{ padding: "10px", fontSize: "14px", color: "#555" }}>
                  <div>{item.type}</div>
                  <div style={{ fontFamily: "Lucida Sans Unicode" }}>/{item.phonetic}/</div>
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button onClick={() => handleDelete(item.id)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>❌</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;