import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [newWord, setNewWord] = useState("");
  const [history, setHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechResults, setSpeechResults] = useState({});
  const [isListening, setIsListening] = useState(null);

  // Link API Render của bạn
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

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    const wordsToAdd = newWord.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (wordsToAdd.length === 0) return;

    setIsProcessing(true);
    for (const word of wordsToAdd) {
      try {
        // Chỉ cần gửi word, backend sẽ tự dịch
        await axios.post(`${API_URL}/check-word`, { word: word });
      } catch (error) {
        console.error(`Lỗi: ${word}`, error);
      }
    }
    setIsProcessing(false);
    setNewWord("");
    fetchHistory();
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/delete/${id}`);
      fetchHistory();
    } catch (error) { console.error(error); }
  };

  const handleListen = (id, targetWord) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Dùng Chrome nhé!"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(id);
    recognition.start();
    recognition.onresult = (event) => {
      setSpeechResults(prev => ({ ...prev, [id]: event.results[0][0].transcript.toLowerCase() }));
      setIsListening(null);
    };
    recognition.onend = () => setIsListening(null);
  };

  const handleUserType = (id, value) => {
    setUserAnswers(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>English Dictation Master 🎤</h1>

      {/* KHU VỰC THÊM TỪ (Đơn giản hóa) */}
      <div style={{ marginBottom: "20px", padding: "15px", background: "#f0f8ff", borderRadius: "8px" }}>
        <p style={{margin: '0 0 10px 0', fontSize: '14px', color: '#666'}}>
          💡 Nhập từ tiếng Anh (ví dụ: <b>apple, love, programming</b>). Hệ thống sẽ tự dịch!
        </p>
        <div style={{display: 'flex', gap: '10px'}}>
            <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            placeholder="Nhập từ tiếng Anh..."
            style={{ padding: "10px", width: "300px", flex: 1 }}
            disabled={isProcessing}
            />
            <button
            onClick={handleAddWord}
            disabled={isProcessing}
            style={{
                padding: "10px 20px", cursor: isProcessing ? "wait" : "pointer",
                background: isProcessing ? "#999" : "#007bff", 
                color: "white", border: "none", borderRadius: "4px",
                fontWeight: "bold"
            }}
            >
            {isProcessing ? "Đang xử lý..." : "Thêm & Dịch"}
            </button>
        </div>
      </div>

      {/* BẢNG LUYỆN TẬP */}
      <table border="1" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ backgroundColor: "#2c3e50", color: "white" }}>
          <tr>
            <th style={{ padding: "10px" }}>STT</th>
            <th style={{ padding: "10px" }}>Điền từ</th>
            <th style={{ padding: "10px" }}>Nghĩa (Tự động)</th> {/* Cột này tự hiện */}
            <th style={{ padding: "10px" }}>Audio</th>
            <th style={{ padding: "10px" }}>Nói</th>
            <th style={{ padding: "10px" }}>Gợi ý</th>
            <th style={{ padding: "10px" }}>Xóa</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => {
            const userAnswer = userAnswers[item.id] || "";
            const isCorrect = userAnswer.trim().toLowerCase() === item.word.toLowerCase();
            const spoken = speechResults[item.id];
            
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px", textAlign: "center" }}>{index + 1}</td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => handleUserType(item.id, e.target.value)}
                    placeholder="Nghe và điền..."
                    style={{
                      padding: "8px", width: "100%",
                      border: isCorrect ? "2px solid green" : "1px solid #ccc",
                      color: isCorrect ? "green" : "black",
                      backgroundColor: isCorrect ? "#e8f5e9" : "white"
                    }}
                  />
                </td>
                
                {/* HIỂN THỊ NGHĨA */}
                <td style={{ padding: "10px", fontWeight: "bold", color: "#d32f2f" }}>
                    {item.meaning || "Đang cập nhật..."}
                </td>

                <td style={{ padding: "10px" }}>
                  {item.audio ? <audio controls src={item.audio} style={{ height: "30px", width: "80px" }} /> : "-"}
                </td>
                <td style={{ padding: "10px" }}>
                  <button onClick={() => handleListen(item.id)} style={{cursor: "pointer", borderRadius: "50%", width: "30px", height: "30px"}}>🎤</button>
                  {spoken && <div style={{fontSize: '10px', color: spoken===item.word.toLowerCase()?'green':'red'}}>{spoken}</div>}
                </td>
                <td style={{ padding: "10px", fontSize: "12px" }}>
                  {item.type} <br/> /{item.phonetic}/
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button onClick={() => handleDelete(item.id)} style={{border:'none', background:'transparent', cursor:'pointer'}}>❌</button>
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