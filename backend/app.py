from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
import os
from deep_translator import GoogleTranslator
app = Flask(__name__)
CORS(app)

# --- CẤU HÌNH DATABASE ---
database_url = os.environ.get('DATABASE_URL', 'sqlite:///words.db')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# --- MODEL (Cần cột meaning) ---
class WordHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False)
    meaning = db.Column(db.String(200)) # Cột lưu nghĩa tiếng Việt
    type = db.Column(db.String(50))
    phonetic = db.Column(db.String(100))
    audio_url = db.Column(db.String(200))
    is_correct = db.Column(db.Boolean, default=False)

with app.app_context():
    db.create_all()

# --- LOGIC TỪ ĐIỂN & DỊCH ---
def get_word_info(word):
    # 1. Check từ điển tiếng Anh
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    
    # 2. Chuẩn bị biến kết quả
    result = {
        "word": word,
        "found": False,
        "meaning": ""
    }

    try:
        # Gọi API từ điển
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()[0]
            result['found'] = True
            
            # Lấy thông tin cơ bản
            result['phonetic'] = data.get('phonetic', '') or data.get('phonetics', [{}])[0].get('text', 'N/A')
            result['type'] = data.get('meanings', [{}])[0].get('partOfSpeech', 'N/A')
            
            audio_url = ""
            for item in data.get('phonetics', []):
                if item.get('audio'):
                    audio_url = item.get('audio')
                    break
            result['audio'] = audio_url

            # --- PHẦN MỚI: DÙNG DEEP TRANSLATOR ---
            try:
                # Dịch từ 'word' sang tiếng Việt (target='vi')
                # source='auto' để nó tự nhận diện tiếng Anh
                translation = GoogleTranslator(source='auto', target='vi').translate(word)
                result['meaning'] = translation
            except Exception as e:
                print(f"Lỗi dịch thuật: {e}")
                result['meaning'] = "Không dịch được"

    except Exception as e:
        print(f"Lỗi API: {e}")

    return result

# --- API ROUTES ---
@app.route('/check-word', methods=['POST'])
def check_word():
    data = request.json
    word_input = data.get('word', '').strip()
    
    if not word_input:
        return jsonify({"error": "No word provided"}), 400
    
    # Gọi hàm xử lý (đã bao gồm dịch tự động)
    result = get_word_info(word_input)
    
    if result['found']:
        new_entry = WordHistory(
            word=word_input,
            meaning=result['meaning'], # Tự động lấy nghĩa từ Google
            type=result.get('type', ''),
            phonetic=result.get('phonetic', ''),
            audio_url=result.get('audio', ''),
            is_correct=True
        )
        db.session.add(new_entry)
        db.session.commit()
        return jsonify(result)
    else:
        return jsonify({"error": "Không tìm thấy từ này"}), 404

@app.route('/history', methods=['GET'])
def get_history():
    history_list = WordHistory.query.order_by(WordHistory.id.desc()).all()
    results = []
    for item in history_list:
        results.append({
            "id": item.id, 
            "word": item.word, 
            "meaning": item.meaning,
            "type": item.type,
            "phonetic": item.phonetic, 
            "audio": item.audio_url, 
            "found": item.is_correct
        })
    return jsonify(results)

@app.route('/delete/<int:id>', methods=['DELETE'])
def delete_word(id):
    word_to_delete = WordHistory.query.get_or_404(id)
    try:
        db.session.delete(word_to_delete)
        db.session.commit()
        return jsonify({"message": "Deleted successfully"})
    except:
        return jsonify({"message": "Error deleting"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)