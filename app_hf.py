import gradio as gr
import tensorflow as tf
import numpy as np
import cv2
from PIL import Image
import io

# Load the trained model
MODEL_PATH = 'research/model_cnn_grayscale.keras'
model = tf.keras.models.load_model(MODEL_PATH)

# Emotion labels
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

    # Reshape for model input
    face_input = face_normalized.reshape(1, 48, 48, 1)

    return face_input

def detect_emotions(image):
    """Detect emotions in the uploaded image"""
    if image is None:
        return "Please upload an image", {}

    try:
        # Convert PIL to OpenCV format
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            return "No faces detected in the image", {}

        # Process each face and collect results
        results = []
        emotion_scores = {emotion: 0.0 for emotion in EMOTION_LABELS}

        # Draw rectangles around faces and get emotions
        output_image = frame.copy()

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

            # Accumulate emotion scores
            for i, emotion in enumerate(EMOTION_LABELS):
                emotion_scores[emotion] += emotion_probabilities[i]

            # Draw rectangle and label on image
            cv2.rectangle(output_image, (x, y), (x+w, y+h), (0, 255, 0), 2)
            label = f"{predicted_emotion}: {confidence:.2f}"
            cv2.putText(output_image, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            results.append(f"Face {len(results)+1}: {predicted_emotion} ({confidence:.2f})")

        # Average emotion scores across all faces
        if len(faces) > 1:
            for emotion in emotion_scores:
                emotion_scores[emotion] /= len(faces)

        # Convert back to RGB for display
        output_image = cv2.cvtColor(output_image, cv2.COLOR_BGR2RGB)

        result_text = f"Found {len(faces)} face(s):\n" + "\n".join(results)

        return output_image, emotion_scores, result_text

    except Exception as e:
        return f"Error processing image: {str(e)}", {}

# Create Gradio interface
def gradio_interface(image):
    """Gradio interface wrapper"""
    if image is None:
        return None, "Please upload an image"

    result_image, emotion_scores, result_text = detect_emotions(image)

    if isinstance(result_image, str):  # Error case
        return None, result_image

    return result_image, result_text

# Create the Gradio app
iface = gr.Interface(
    fn=gradio_interface,
    inputs=gr.Image(type="pil", label="Upload Image for Emotion Detection"),
    outputs=[
        gr.Image(type="pil", label="Detected Faces with Emotions"),
        gr.Textbox(label="Detection Results", lines=5)
    ],
    title="🎭 Facial Emotion Detection",
    description="""
    Upload an image to detect emotions in faces! This model recognizes 4 emotions:
    **Happy**, **Sad**, **Neutral**, and **Surprised**.

    The model uses a custom CNN trained on 48x48 grayscale images and achieves 72% accuracy.
    """,
    examples=[
        # You can add example images here if you have some
    ],
    theme="default",
    allow_flagging="never"
)

if __name__ == "__main__":
    # For Hugging Face Spaces
    iface.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False
    )