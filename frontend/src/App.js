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

  // ... (Các phần import và logic phía trên giữ nguyên)

  return (
    <div className="App" style={{ padding: "30px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{textAlign: "center", color: "#2c3e50"}}>English Dictation Master 🎤</h1>

      {/* INPUT AREA */}
      <div style={{ marginBottom: "30px", padding: "20px", background: "#f8f9fa", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <p style={{margin: '0 0 10px 0', fontSize: '15px', color: '#666', textAlign: "center"}}>
           💡 Nhập từ tiếng Anh (ví dụ: <b>apple, love, programming</b>). Hệ thống sẽ tự dịch!
        </p>
        <div style={{display: 'flex', gap: '10px', justifyContent: "center"}}>
            <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            placeholder="Nhập từ tiếng Anh..."
            style={{ 
                padding: "12px", 
                width: "100%", // Fix lỗi tràn khung
                maxWidth: "400px", // Giới hạn chiều rộng tối đa
                border: "1px solid #ced4da", 
                borderRadius: "6px",
                outline: "none",
                fontSize: "16px"
            }}
            disabled={isProcessing}
            />
            <button
            onClick={handleAddWord}
            disabled={isProcessing}
            style={{
                padding: "12px 25px", cursor: isProcessing ? "wait" : "pointer",
                background: isProcessing ? "#95a5a6" : "#007bff", 
                color: "white", border: "none", borderRadius: "6px",
                fontWeight: "600", fontSize: "16px",
                transition: "background 0.3s"
            }}
            >
            {isProcessing ? "Adding..." : "Thêm & Dịch"}
            </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={{overflowX: "auto", borderRadius: "8px", boxShadow: "0 0 10px rgba(0,0,0,0.05)"}}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead style={{ backgroundColor: "#34495e", color: "white" }}>
            <tr>
              <th style={{ padding: "15px", textAlign: "center", width: "50px" }}>#</th>
              <th style={{ padding: "15px", textAlign: "left" }}>Điền từ</th>
              <th style={{ padding: "15px", textAlign: "left" }}>Nghĩa</th> 
              <th style={{ padding: "15px", textAlign: "center" }}>Audio</th>
              <th style={{ padding: "15px", textAlign: "center" }}>Luyện nói</th>
              <th style={{ padding: "15px", textAlign: "left" }}>Gợi ý</th>
              <th style={{ padding: "15px", textAlign: "center" }}>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => {
              const userAnswer = userAnswers[item.id] || "";
              // Logic check: Đúng thì true
              const isCorrect = userAnswer.trim().toLowerCase() === item.word.toLowerCase();
              const spoken = speechResults[item.id];
              
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee", height: "60px" }}>
                  <td style={{ textAlign: "center", color: "#7f8c8d" }}>{index + 1}</td>
                  
                  {/* CỘT ĐIỀN TỪ (FIX LỖI 1) */}
                  <td style={{ padding: "10px" }}>
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => handleUserType(item.id, e.target.value)}
                      placeholder="Nghe và điền..."
                      disabled={isCorrect} // Đúng rồi thì khóa lại không cho sửa
                      style={{
                        padding: "10px", 
                        width: "100%", 
                        boxSizing: "border-box", // Quan trọng: Giúp padding không làm phình to input
                        border: isCorrect ? "2px solid #2ecc71" : "1px solid #ccc",
                        color: isCorrect ? "#27ae60" : "#333",
                        backgroundColor: isCorrect ? "#eaffea" : "white",
                        borderRadius: "4px",
                        fontWeight: isCorrect ? "bold" : "normal"
                      }}
                    />
                  </td>
                  
                  {/* CỘT NGHĨA (FIX LỖI 2) */}
                  <td style={{ padding: "10px", color: "#555", textTransform: "capitalize" }}>
                      {item.meaning || "Wait..."}
                  </td>

                  {/* CỘT AUDIO (FIX LỖI 3 - UI) */}
                  <td style={{ textAlign: "center" }}>
                    {item.audio ? (
                        <audio controls src={item.audio} style={{ height: "30px", maxWidth: "120px" }} />
                    ) : (
                        <span style={{fontSize: "12px", color: "#999"}}>No Audio</span>
                    )}
                  </td>

                  {/* CỘT NÓI (FIX LỖI 4) */}
                  <td style={{ textAlign: "center" }}>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <button 
                            onClick={() => handleListen(item.id)} 
                            style={{
                                cursor: "pointer", borderRadius: "50%", width: "40px", height: "40px", 
                                border: "1px solid #ddd", background: "white", fontSize: "18px",
                                marginBottom: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                            }}
                            title="Click to speak"
                        >
                            🎤
                        </button>
                        {/* Kết quả nói hiển thị nhỏ gọn */}
                        {spoken && (
                            <span style={{
                                fontSize: '11px', 
                                fontWeight: 'bold',
                                padding: "2px 6px",
                                borderRadius: "4px",
                                color: spoken === item.word.toLowerCase() ? "white" : "white",
                                background: spoken === item.word.toLowerCase() ? "#2ecc71" : "#e74c3c"
                            }}>
                                {spoken}
                            </span>
                        )}
                    </div>
                  </td>

                  <td style={{ padding: "10px", fontSize: "13px", color: "#666" }}>
                    <div style={{fontStyle: "italic"}}>{item.type}</div>
                    <div style={{color: "#888"}}>/{item.phonetic}/</div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => handleDelete(item.id)} style={{border:'none', background:'transparent', cursor:'pointer', color: "#e74c3c", fontSize: "18px"}}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );