import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from deep_translator import GoogleTranslator  # Dùng thư viện này ổn định hơn

app = Flask(__name__)
CORS(app)  # Cho phép Frontend gọi API thoải mái

# --- 1. CẤU HÌNH DATABASE (Tương thích Render) ---
database_url = os.environ.get('DATABASE_URL', 'sqlite:///words.db')
# Fix lỗi đặc thù của Render: 'postgres://' -> 'postgresql://'
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- 2. MODEL DATABASE ---
class WordHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False)
    meaning = db.Column(db.String(200))
    type = db.Column(db.String(50))
    phonetic = db.Column(db.String(100))
    audio_url = db.Column(db.String(500)) # Tăng độ dài để chứa link dài
    is_correct = db.Column(db.Boolean, default=True)

# Tạo bảng nếu chưa có
with app.app_context():
    db.create_all()

# --- 3. HÀM XỬ LÝ LOGIC (Trái tim của App) ---
def get_word_details(word):
    # Biến lưu kết quả mặc định
    result = {
        "word": word,
        "found": False,
        "meaning": "",
        "type": "",
        "phonetic": "",
        "audio": ""
    }

    # BƯỚC 1: Gọi API Từ điển Tiếng Anh
    try:
        api_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        response = requests.get(api_url)
        
        if response.status_code == 200:
            data = response.json()[0] # Lấy entry đầu tiên
            result['found'] = True
            
            # Lấy loại từ (noun, verb...)
            meanings = data.get('meanings', [])
            if meanings:
                result['type'] = meanings[0].get('partOfSpeech', 'unknown')

            # --- QUAN TRỌNG: FIX LỖI MẤT AUDIO ---
            # API trả về một danh sách các phonetics. 
            # Cái đầu tiên thường rỗng audio, nên phải dùng vòng lặp để tìm cái có audio.
            phonetics = data.get('phonetics', [])
            
            audio_src = ""
            text_phonetic = ""

            for item in phonetics:
                # Ưu tiên tìm link audio
                if not audio_src and item.get('audio'):
                    audio_src = item.get('audio')
                
                # Ưu tiên tìm phiên âm text (ví dụ: /həˈləʊ/)
                if not text_phonetic and item.get('text'):
                    text_phonetic = item.get('text')
                
                # Nếu tìm được cả 2 rồi thì dừng vòng lặp ngay cho nhanh
                if audio_src and text_phonetic:
                    break
            
            result['audio'] = audio_src
            result['phonetic'] = text_phonetic if text_phonetic else "N/A"

    except Exception as e:
        print(f"Lỗi khi gọi Dictionary API: {e}")

    # BƯỚC 2: Gọi Google Dịch (Sang Tiếng Việt)
    try:
        # source='auto' tự nhận diện, target='vi' là tiếng Việt
        translated = GoogleTranslator(source='auto', target='vi').translate(word)
        result['meaning'] = translated
    except Exception as e:
        print(f"Lỗi dịch thuật: {e}")
        result['meaning'] = "Không dịch được"

    return result

# --- 4. CÁC ROUTES API ---

@app.route('/', methods=['GET'])
def home():
    return "Backend is running!", 200

# --- CẤU HÌNH MẬT KHẨU ADMIN ---
# Bạn hãy đổi 'vandoanh123' thành mật khẩu khó đoán hơn nhé
ADMIN_PASSWORD = "280707" 

@app.route('/check-word', methods=['POST'])
def check_word():
    data = request.json
    
    # --- ĐOẠN MỚI: KIỂM TRA QUYỀN ---
    user_secret = data.get('secret', '')
    if user_secret != ADMIN_PASSWORD:
        return jsonify({"error": "Bạn không có quyền thêm từ mới!"}), 403
    # --------------------------------
    
    word_input = data.get('word', '').strip()
    
    if not word_input:
        return jsonify({"error": "Chưa nhập từ"}), 400

    # ... (Phần code logic bên dưới giữ nguyên không đổi)
    info = get_word_details(word_input)
    # ...

    # Lưu vào Database
    try:
        new_entry = WordHistory(
            word=info['word'],
            meaning=info['meaning'],
            type=info.get('type', ''),
            phonetic=info.get('phonetic', ''),
            audio_url=info.get('audio', ''),
            is_correct=True
        )
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        print(f"Lỗi Database: {e}")
        return jsonify({"error": "Lỗi lưu dữ liệu"}), 500

    return jsonify(info)

@app.route('/history', methods=['GET'])
def get_history():
    # Lấy danh sách từ mới nhất lên đầu
    items = WordHistory.query.order_by(WordHistory.id.desc()).all()
    results = []
    for item in items:
        results.append({
            "id": item.id,
            "word": item.word,
            "meaning": item.meaning,
            "type": item.type,
            "phonetic": item.phonetic,
            "audio": item.audio_url,
            "found": True
        })
    return jsonify(results)

# --- TÌM ĐOẠN NÀY TRONG FILE app.py VÀ THAY THẾ ---

@app.route('/delete/<int:id>', methods=['DELETE'])
def delete_word(id):
    # Lấy dữ liệu gửi kèm (với method DELETE, cần dùng get_json(silent=True))
    data = request.get_json(silent=True) or {}
    user_secret = data.get('secret', '')

    # --- KIỂM TRA MẬT KHẨU ADMIN ---
    if user_secret != ADMIN_PASSWORD:
        return jsonify({"error": "Bạn không có quyền xóa!"}), 403
    # -------------------------------

    word = WordHistory.query.get_or_404(id)
    try:
        db.session.delete(word)
        db.session.commit()
        return jsonify({"message": "Đã xóa thành công"})
    except:
        return jsonify({"error": "Lỗi khi xóa"}), 500

if __name__ == '__main__':
    # Chạy debug ở localhost
    app.run(debug=True, port=5000)