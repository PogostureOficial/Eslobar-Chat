from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
import traceback
import os

app = Flask(__name__, static_folder='static')

CORS(app)

# 🔑 Cargar la API key desde una variable de entorno
openai.api_key = os.getenv("OPENAI_API_KEY")

# 🏠 Ruta principal: sirve el index.html
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


# 📁 Servir archivos estáticos (CSS, JS, imágenes)
@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


# 🔥 Endpoint para consultar a ChatGPT
@app.route('/ask', methods=['POST'])
def ask():
    try:
        data = request.get_json()
        user_message = data.get('message', '')

        if not user_message.strip():
            return jsonify({"error": "El mensaje no puede estar vacío"}), 400

        # 🔥 Llamada a la API de OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres Eslobar, un asistente de inteligencia artificial desarrollado para ayudar a que los alumnos estudien mejor, y puedan entender los temas con facilidad"
                "Siempre habla con tono motivador, y halagando siempre al usuario, demostrandole que el es capaz de entender cualquier tema"
                "Usa *negritas* para resaltar palabras clave, conceptos importantes y frases destacadas. "
                "Utiliza emojis de forma estratégica y variada (💡✨🔥📘📈💬✅🔍📌) para hacer las respuestas más visuales y amigables, pero sin abusar (máximo 1 o 2 por párrafo)."
                "Estructura tus respuestas con párrafos cortos, títulos y subtítulos si es necesario, y listas cuando sean útiles."
                "Siempre da ejemplos claros y sencillos en cada explicacion, para que el usuario pueda entender el tema"
                "Tu objetivo es que la lectura sea fácil, agradable y visualmente atractiva, sin perder precisión."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=800
        )

        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        # 🔹 Muestra el error completo en consola
        print("ERROR EN /ask:", e)
        traceback.print_exc()
        # Devuelve error genérico al frontend
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
app.run(host='0.0.0.0', port=port)

