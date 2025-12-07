from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
import os

app = Flask(__name__)
CORS(app)

# --- CẤU HÌNH DATABASE ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'words.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODEL ---
class WordHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50))
    phonetic = db.Column(db.String(100))
    audio_url = db.Column(db.String(200))
    is_correct = db.Column(db.Boolean, default=False)

with app.app_context():
    db.create_all()

# --- LOGIC TỪ ĐIỂN ---
def get_word_info(word):
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()[0]
            phonetic = data.get('phonetic', '') or data.get('phonetics', [{}])[0].get('text', 'N/A')
            
            audio_url = ""
            for item in data.get('phonetics', []):
                if item.get('audio'):
                    audio_url = item.get('audio')
                    break
            
            part_of_speech = data.get('meanings', [{}])[0].get('partOfSpeech', 'N/A')

            return {
                "word": word,
                "found": True,
                "phonetic": phonetic,
                "type": part_of_speech,
                "audio": audio_url
            }
        return {"word": word, "found": False}
    except:
        return {"word": word, "found": False}

# --- API ROUTES ---

@app.route('/check-word', methods=['POST'])
def check_word():
    data = request.json
    word_input = data.get('word', '').strip()
    if not word_input:
        return jsonify({"error": "No word provided"}), 400
    
    result = get_word_info(word_input)
    
    # Chỉ lưu nếu tìm thấy từ
    if result['found']:
        new_entry = WordHistory(
            word=word_input,
            type=result.get('type', ''),
            phonetic=result.get('phonetic', ''),
            audio_url=result.get('audio', ''),
            is_correct=result.get('found', False)
        )
        db.session.add(new_entry)
        db.session.commit()
        return jsonify(result)
    else:
        return jsonify({"error": "Không tìm thấy từ này trong từ điển"}), 404

@app.route('/history', methods=['GET'])
def get_history():
    history_list = WordHistory.query.order_by(WordHistory.id.desc()).all()
    results = []
    for item in history_list:
        results.append({
            "id": item.id,
            "word": item.word,
            "type": item.type,
            "phonetic": item.phonetic,
            "audio": item.audio_url,
            "found": item.is_correct
        })
    return jsonify(results)

# --- API MỚI: XÓA TỪ ---
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