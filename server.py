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
openai.api_key = os.getenv("OPENAI_API_KEY")

# 🏠 Ruta principal: sirve el index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


# 📁 Servir archivos estáticos (CSS, JS, imágenes)
@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


# 🔥 Endpoint para consultar a ChatGPT
# 🔥 Endpoint para consultar a ChatGPT
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    user_message = data.get("message", "")
    plan = data.get("plan", "basic")  # "basic", "plus" o "pro"

    if not user_message.strip():
        return jsonify({"error": "El mensaje no puede estar vacío"}), 400

    # 🔹 Prompt según plan
    if plan == "basic":
        system_prompt = "Responde de forma breve y simple. No incluyas explicaciones extensas. Si alguien te pregunta que version eres, di que eres la version Basica, y aclaralo en todos tus mensajes"
    elif plan == "plus":
        system_prompt = "Explica con más detalle, usando ejemplos si es necesario. Cubre más materias. Si alguien te pregunta que version eres, di que eres la version Plus, y aclaralo en todos tus mensajes"
    elif plan == "pro":
        system_prompt = "Eres un profesor experto. Proporciona explicaciones profundas, paso a paso, con todas las materias disponibles. Si alguien te pregunta que version eres, di que eres la version Pro, y aclaralo en todos tus mensajes"
    else:
        system_prompt = "Responde de forma breve y simple."

    try:
        # 🔹 Llamada al modelo
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",   # o "gpt-4o-mini" si quieres ese
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )

        reply = response.choices[0].message["content"]
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









