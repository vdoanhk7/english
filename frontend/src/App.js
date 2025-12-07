import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [newWord, setNewWord] = useState("");
  const [history, setHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});

  // State lưu kết quả phát âm: { id_dòng: "từ bạn vừa nói" }
  const [speechResults, setSpeechResults] = useState({});
  const [isListening, setIsListening] = useState(null); // Lưu id dòng đang nghe

  // Hàm lấy dữ liệu từ Backend
  const fetchHistory = async () => {
    try {
      const res = await axios.get("https://dictation-backend-skto.onrender.com/history");
      setHistory(res.data);
    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- XỬ LÝ THÊM TỪ ---
  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    try {
      await axios.post("https://dictation-backend-skto.onrender.com/check-word", { word: newWord });
      setNewWord("");
      fetchHistory();
    } catch (error) {
      alert("Không tìm thấy từ này hoặc lỗi server!");
    }
  };

  // --- XỬ LÝ XÓA TỪ ---
  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://dictation-backend-skto.onrender.com/delete/${id}`);
      fetchHistory(); // Load lại bảng sau khi xóa
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  // --- XỬ LÝ NHẬN DIỆN GIỌNG NÓI (Speech to Text) ---
  const handleListen = (id, targetWord) => {
    // Kiểm tra trình duyệt có hỗ trợ không
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ chức năng này. Hãy dùng Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // Chế độ nghe tiếng Anh
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(id); // Bật hiệu ứng đang nghe cho dòng này

    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      // Lưu kết quả nghe được
      setSpeechResults((prev) => ({
        ...prev,
        [id]: transcript,
      }));
      setIsListening(null);
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      setIsListening(null);
      alert("Không nghe rõ, vui lòng thử lại!");
    };

    recognition.onend = () => {
      setIsListening(null);
    };
  };

  const handleUserType = (id, value) => {
    setUserAnswers((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>English Dictation Master 🎤</h1>

      {/* KHU VỰC THÊM TỪ */}
      <div style={{ marginBottom: "20px", padding: "15px", background: "#f0f8ff", borderRadius: "8px" }}>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Nhập từ gốc (VD: vocabulary)..."
          style={{ padding: "8px", width: "300px" }}
        />
        <button
          onClick={handleAddWord}
          style={{
            marginLeft: "10px", padding: "8px 15px", cursor: "pointer",
            background: "#007bff", color: "white", border: "none", borderRadius: "4px",
          }}
        >
          Thêm đề bài
        </button>
      </div>

      {/* BẢNG LUYỆN TẬP */}
      <table border="1" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ backgroundColor: "#343a40", color: "white" }}>
          <tr>
            <th style={{ padding: "10px", width: "50px" }}>STT</th>
            <th style={{ padding: "10px" }}>Điền đáp án</th>
            <th style={{ padding: "10px" }}>Nghe mẫu</th>
            <th style={{ padding: "10px" }}>Luyện nói (Chấm điểm)</th>
            <th style={{ padding: "10px" }}>Gợi ý</th>
            <th style={{ padding: "10px", textAlign: "center" }}>Xóa</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => {
            const userAnswer = userAnswers[item.id] || "";
            const isCorrectType = userAnswer.trim().toLowerCase() === item.word.toLowerCase();

            // Logic chấm điểm nói
            const spokenWord = speechResults[item.id];
            let speakColor = "gray";
            let speakStatus = "Chưa nói";

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
                {/* Cột 1: STT */}
                <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>
                  {index + 1}
                </td>

                {/* Cột 2: Ô điền từ */}
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
                    }}
                  />
                </td>

                {/* Cột 3: Audio Mẫu */}
                <td style={{ padding: "10px" }}>
                  {item.audio ? (
                    <audio controls src={item.audio} style={{ height: "30px", width: "100px" }} />
                  ) : "-"}
                </td>

                {/* CỘT 4: LUYỆN NÓI */}
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => handleListen(item.id, item.word)}
                    style={{
                      cursor: "pointer",
                      background: isListening === item.id ? "red" : "white",
                      color: isListening === item.id ? "white" : "black",
                      border: "1px solid #ccc", borderRadius: "50%",
                      width: "35px", height: "35px",
                    }}
                    title="Bấm để nói"
                  >
                    🎤
                  </button>
                  <span style={{ marginLeft: "10px", color: speakColor, fontWeight: "bold" }}>
                    {isListening === item.id ? "Đang nghe..." : speakStatus}
                  </span>
                </td>

                {/* Cột 5: Gợi ý */}
                <td style={{ padding: "10px", fontSize: "14px", color: "#555" }}>
                  <div>Type: {item.type}</div>
                  <div style={{ fontFamily: "Lucida Sans Unicode" }}>/{item.phonetic}/</div>
                </td>

                {/* Cột 6: Nút Xóa */}
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: "transparent", border: "none",
                      padding: "5px 10px", cursor: "pointer",
                    }}
                  >
                    ❌
                  </button>
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