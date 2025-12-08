import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [newWord, setNewWord] = useState("");
  const [history, setHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechResults, setSpeechResults] = useState({});
  const [listeningId, setListeningId] = useState(null);

  // --- CẤU HÌNH API ---
  const API_URL = "https://dictation-backend-skto.onrender.com";

  // --- HÀM LOAD DỮ LIỆU ---
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

  // --- HÀM THÊM TỪ ---
  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    const wordsToAdd = newWord
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (wordsToAdd.length === 0) return;

    setIsProcessing(true);
    const requests = wordsToAdd.map((word) =>
      axios
        .post(`${API_URL}/check-word`, { word: word })
        .catch((err) => console.error(`Lỗi thêm từ ${word}:`, err)),
    );
    await Promise.all(requests);
    setIsProcessing(false);
    setNewWord("");
    fetchHistory();
  };

  // --- HÀM XÓA TỪ ---
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/delete/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Lỗi xóa:", error);
      fetchHistory();
    }
  };

  // --- HÀM ĐẢO TỪ ---
  const handleShuffle = () => {
    const shuffled = [...history];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setHistory(shuffled);
  };

  // --- HÀM XỬ LÝ GIỌNG NÓI ---
  const handleListen = (id) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ. Hãy dùng Google Chrome!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListeningId(id);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const cleanTranscript = transcript.replace(
        /[.,\/#!$%\^&\*;:{}=\-_`~()]/g,
        "",
      );
      setSpeechResults((prev) => ({ ...prev, [id]: cleanTranscript }));
      setListeningId(null);
    };

    recognition.onerror = () => setListeningId(null);
    recognition.onend = () => setListeningId(null);
  };

  const handleUserType = (id, value) => {
    setUserAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // --- GIAO DIỆN (JSX) ---
  return (
    <div
      className="App"
      style={{
        padding: "20px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
        backgroundColor: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      {/* --- PHẦN HEADER MỚI (MADE BY & CONTACT) --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          color: "#7f8c8d",
          fontSize: "13px",
          fontWeight: "600",
        }}
      >
        <div>
          🛠️ Made by <span style={{ color: "#2c3e50" }}>Vandoanh for Nmai</span>
        </div>
        <div>
          📧 Contact:{" "}
          <a
            href="mailto:vandoanhk7@gmail.com" // Thay email của bạn vào đây
            style={{ color: "#3498db", textDecoration: "none" }}
          >
            Ấn zô để liên hệ
          </a>
        </div>
      </div>

      <h1
        style={{ textAlign: "center", color: "#2c3e50", marginBottom: "20px" }}
      >
        English Dictation Master 🎤
      </h1>

      {/* --- PHẦN CẢNH BÁO XOAY NGANG (MỚI) --- */}
      <div
        style={{
          backgroundColor: "#fff3cd", // Màu vàng nhạt cảnh báo
          color: "#856404", // Chữ màu vàng đậm
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center",
          fontSize: "14px",
          border: "1px solid #ffeeba",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span>📱</span>
        <span>
          <b>Lưu ý:</b> Nếu dùng điện thoại, hãy <b>xoay ngang màn hình</b> để
          có trải nghiệm tốt nhất!
        </span>
      </div>

      {/* KHU VỰC NHẬP TỪ */}
      <div
        style={{
          marginBottom: "20px",
          padding: "25px",
          background: "white",
          borderRadius: "15px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        }}
      >
        <p
          style={{
            margin: "0 0 15px 0",
            fontSize: "15px",
            color: "#666",
            textAlign: "center",
          }}
        >
          💡 Nhập từ tiếng Anh (ví dụ: <b>apple, love, programming</b>). Hệ
          thống sẽ tự dịch!
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            placeholder="Nhập từ tiếng Anh..."
            style={{
              padding: "12px 20px",
              width: "100%",
              maxWidth: "400px",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              outline: "none",
              fontSize: "16px",
            }}
            disabled={isProcessing}
          />
          <button
            onClick={handleAddWord}
            disabled={isProcessing}
            style={{
              padding: "12px 30px",
              cursor: isProcessing ? "wait" : "pointer",
              background: isProcessing ? "#95a5a6" : "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "16px",
            }}
          >
            {isProcessing ? "Đang xử lý..." : "Thêm & Dịch"}
          </button>
        </div>
      </div>

      {/* NÚT ĐẢO TỪ */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "10px",
        }}
      >
        <button
          onClick={handleShuffle}
          style={{
            padding: "8px 15px",
            background: "#9b59b6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          🔀 Đảo thứ tự
        </button>
      </div>

      {/* BẢNG TỪ VỰNG */}
      <div
        style={{
          overflowX: "auto",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#2c3e50", color: "white" }}>
            <tr>
              <th style={{ padding: "15px", width: "50px" }}>#</th>
              <th style={{ padding: "15px", textAlign: "left", width: "25%" }}>
                Điền từ
              </th>
              <th style={{ padding: "15px", textAlign: "left", width: "20%" }}>
                Nghĩa
              </th>
              <th style={{ padding: "15px", textAlign: "center" }}>Audio</th>
              <th style={{ padding: "15px", textAlign: "center" }}>
                Luyện nói
              </th>
              <th style={{ padding: "15px", textAlign: "left" }}>Thông tin</th>
              <th style={{ padding: "15px", textAlign: "center" }}>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => {
              const userAnswer = userAnswers[item.id] || "";
              const isCorrect =
                userAnswer.trim().toLowerCase() === item.word.toLowerCase();
              const spokenResult = speechResults[item.id];
              const isSpeaking = listeningId === item.id;

              return (
                <tr
                  key={item.id}
                  style={{ borderBottom: "1px solid #f1f1f1", height: "70px" }}
                >
                  <td
                    style={{
                      textAlign: "center",
                      color: "#95a5a6",
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => handleUserType(item.id, e.target.value)}
                      placeholder="Nghe và điền..."
                      disabled={isCorrect}
                      style={{
                        padding: "10px",
                        width: "100%",
                        boxSizing: "border-box",
                        border: isCorrect
                          ? "2px solid #2ecc71"
                          : "1px solid #dfe6e9",
                        color: isCorrect ? "#27ae60" : "#2d3436",
                        backgroundColor: isCorrect ? "#f0fff4" : "#fff",
                        borderRadius: "6px",
                        fontWeight: isCorrect ? "bold" : "normal",
                        fontSize: "15px",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      color: "#555",
                      textTransform: "capitalize",
                      fontSize: "15px",
                    }}
                  >
                    {(item.meaning || "").toLowerCase()}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {item.audio ? (
                      <audio
                        controls
                        src={item.audio}
                        style={{ height: "32px", maxWidth: "110px" }}
                      />
                    ) : (
                      <span style={{ fontSize: "12px", color: "#bdc3c7" }}>
                        No Audio
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <button
                        onClick={() => handleListen(item.id)}
                        style={{
                          cursor: "pointer",
                          borderRadius: "50%",
                          width: "40px",
                          height: "40px",
                          border: isSpeaking
                            ? "2px solid #e74c3c"
                            : "1px solid #dfe6e9",
                          background: isSpeaking ? "#ffebee" : "white",
                          fontSize: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSpeaking ? "👂" : "🎤"}
                      </button>
                      {spokenResult && (
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: "600",
                            color: "white",
                            backgroundColor:
                              spokenResult === item.word.toLowerCase()
                                ? "#2ecc71"
                                : "#e74c3c",
                          }}
                        >
                          {spokenResult}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: "#34495e",
                      }}
                    >
                      {item.type}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7f8c8d",
                        fontFamily: "monospace",
                      }}
                    >
                      /{item.phonetic}/
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#fab1a0",
                        fontSize: "20px",
                      }}
                      onMouseOver={(e) => (e.target.style.color = "#d63031")}
                      onMouseOut={(e) => (e.target.style.color = "#fab1a0")}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {history.length === 0 && (
          <div
            style={{ padding: "40px", textAlign: "center", color: "#bdc3c7" }}
          >
            Chưa có từ vựng nào. Hãy thêm từ mới!
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
