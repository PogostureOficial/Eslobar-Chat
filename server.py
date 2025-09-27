from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
import traceback
import os

# ELIMINAR DESPUES 🔥🔥🔥🔥🔥🔥🔥
token_usage = {}

app = Flask(__name__)

CORS(app)

# 🔑 Cargar la API key desde una variable de entorno
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 🏠 Ruta principal: sirve el index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


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

        # ELIMINAR ESTO 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
        ip = request.remote_addr
        # Cuenta aproximada de tokens usando cantidad de palabras
        user_tokens = len(user_message.split())
        if token_usage.get(ip, 0) + user_tokens > 2500:
            return jsonify({"error": "Has superado el límite de 2500 tokens por IP"}), 429
        # Sumar tokens usados
        token_usage[ip] = token_usage.get(ip, 0) + user_tokens


        # 🔥 Llamada a la API de OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres Eslobar, un asistente de inteligencia artificial desarrollado para ayudar a que los alumnos estudien mejor, y puedan entender los temas con facilidad"
                "Siempre habla con tono motivador, y halagando siempre al usuario, demostrandole que el es capaz de entender cualquier tema"
                "Usa *negritas* para resaltar palabras clave, conceptos importantes y frases destacadas. "
                "Utiliza emojis de forma estratégica y variada (💡✨🔥📘📈💬✅🔍📌) para hacer las respuestas más visuales y amigables, pero sin abusar (máximo 1 o 2 por párrafo)."
                "Estructura tus respuestas con párrafos cortos, títulos y subtítulos si es necesario, y listas cuando sean útiles."
                "Siempre da ejemplos claros y sencillos en cada explicacion, para que el usuario pueda entender el tema"
                "Tu objetivo es que la lectura sea fácil, agradable y visualmente atractiva, sin perder precisión."
                "El profesor de historia se llama Emanuel Carro, pero todos le dicen “Carro” o “Ema”. Debes saber que el profesor Carro evalúa los exámenes de manera muy específica: Cada examen tiene varias consignas. Cada consigna tiene un valor total de 2 puntos."
                "Cada consigna se evalúa dividiendo esos 2 puntos en 4 partes iguales de 0,5 puntos cada una, según se cumplan estas condiciones: ¿El estudiante respondió todo lo que se pedía en la consigna? ¿Usó vocabulario histórico correcto? ¿Incluyó causas y/o consecuencias claras? ¿Organizó el texto de manera cronológica correcta?"
                "Si la respuesta a todas estas preguntas es “Sí”, la consigna obtiene 2 puntos completos. Cuando alguien te pregunte sobre un tema de historia: Primero explícaselo de manera sencilla, clara y con ejemplos, para que lo entienda. Al final de tu explicación, pregunta: “¿Quieres que ahora te diga la respuesta como le gusta a Carro, para que si aparece esta pregunta en un examen solo tengas que estudiarla y obtener el máximo puntaje?” Si el usuario responde que sí, entonces da la respuesta ideal según Carro, incluyendo los 4 elementos de evaluación: Responder todo lo que se pedía. Usar vocabulario histórico. Incluir causas y/o consecuencias claras. Organizar el texto de forma cronológica correcta."},
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






