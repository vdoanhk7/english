import requests

def get_word_info(word):
    # Endpoint của Free Dictionary API
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    
    try:
        # Gửi Request lên server
        response = requests.get(url)
        
        # Nếu Status Code là 200 (OK) -> Tìm thấy từ
        if response.status_code == 200:
            data = response.json()[0] # Lấy kết quả đầu tiên
            
            # 1. Lấy Phonetic (Phiên âm)
            phonetic = data.get('phonetic', '') or data.get('phonetics', [{}])[0].get('text', 'N/A')
            
            # 2. Lấy Audio (Phát âm) - Lọc tìm file audio có đuôi .mp3
            audio_url = ""
            for item in data.get('phonetics', []):
                if item.get('audio'):
                    audio_url = item.get('audio')
                    break
            
            # 3. Lấy Part of Speech (Loại từ: noun, verb...)
            # Một từ có thể có nhiều loại, ở đây ta lấy loại đầu tiên tìm thấy
            part_of_speech = data.get('meanings', [{}])[0].get('partOfSpeech', 'N/A')

            return {
                "word": word,
                "found": True, # Cột E: True
                "phonetic": phonetic, # Cột D
                "type": part_of_speech, # Cột C
                "audio": audio_url # Cột B
            }
        else:
            # Không tìm thấy từ -> Sai chính tả
            return {
                "word": word,
                "found": False # Cột E: False
            }

    except Exception as e:
        print(f"Error: {e}")
        return {"found": False}

# --- TEST THỬ ---
if __name__ == "__main__":
    # Test 1 từ đúng
    print(get_word_info("hello")) 
    
    print("-" * 20)
    
    # Test 1 từ sai chính tả
    print(get_word_info("helol"))