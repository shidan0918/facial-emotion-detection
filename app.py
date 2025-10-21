from flask import Flask, render_template, request, jsonify, Response
import tensorflow as tf
import numpy as np
import cv2
import base64
from PIL import Image
import io
import json

app = Flask(__name__)

# Load the trained model
MODEL_PATH = 'research/model_cnn_grayscale.keras'
model = tf.keras.models.load_model(MODEL_PATH)

# Emotion labels (from your notebook)
EMOTION_LABELS = ['happy', 'sad', 'neutral', 'surprised']

# Load face detection cascade
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def preprocess_face(face_img):
    """Preprocess face image for model prediction"""
    # Resize to 48x48
    face_resized = cv2.resize(face_img, (48, 48))

    # Convert to grayscale if needed
    if len(face_resized.shape) == 3:
        face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
    else:
        face_gray = face_resized

    # Normalize to [0,1]
    face_normalized = face_gray.astype('float32') / 255.0

    # Reshape for model input (batch_size, height, width, channels)
    face_input = face_normalized.reshape(1, 48, 48, 1)

    return face_input

def detect_emotion(image_data):
    """Detect emotions in the image"""
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))

        # Convert PIL to OpenCV format
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        results = []
        for (x, y, w, h) in faces:
            # Extract face region
            face_roi = gray[y:y+h, x:x+w]

            # Preprocess for model
            face_input = preprocess_face(face_roi)

            # Predict emotion
            predictions = model.predict(face_input, verbose=0)
            emotion_probabilities = predictions[0]
            predicted_emotion_idx = np.argmax(emotion_probabilities)
            predicted_emotion = EMOTION_LABELS[predicted_emotion_idx]
            confidence = float(emotion_probabilities[predicted_emotion_idx])

            # Create result for this face
            face_result = {
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h),
                'emotion': predicted_emotion,
                'confidence': confidence,
                'probabilities': {
                    EMOTION_LABELS[i]: float(prob) for i, prob in enumerate(emotion_probabilities)
                }
            }
            results.append(face_result)

        return {'success': True, 'faces': results}

    except Exception as e:
        return {'success': False, 'error': str(e)}

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """Handle emotion prediction requests"""
    try:
        data = request.get_json()
        image_data = data.get('image')

        if not image_data:
            return jsonify({'success': False, 'error': 'No image data provided'})

        result = detect_emotion(image_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    import os
    print("Starting Facial Emotion Detection Server...")
    print(f"Model loaded from: {MODEL_PATH}")
    print(f"Emotion labels: {EMOTION_LABELS}")

    # Get port from environment variable for cloud deployment
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'

    app.run(debug=debug, host='0.0.0.0', port=port)