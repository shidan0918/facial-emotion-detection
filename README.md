# Live Facial Emotion Detection Website

A real-time facial emotion detection website built with Flask, TensorFlow, and OpenCV. This application uses your trained CNN model to detect emotions (happy, sad, neutral, surprised) from live camera feed.

## Features

- **Real-time emotion detection** from webcam feed
- **Live face detection** with bounding boxes
- **Emotion probability visualization** with interactive bars
- **Modern responsive UI** with real-time FPS counter
- **Multiple face support** - detects emotions for multiple faces simultaneously

## Setup and Installation

### Prerequisites
- Python 3.13+
- Poetry for package management
- A webcam for live detection

### Installation

1. **Install dependencies using Poetry:**
   ```bash
   poetry install
   ```

2. **Activate the Poetry shell:**
   ```bash
   poetry shell
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:5000
   ```

## Usage

1. **Start Camera**: Click "Start Camera" to access your webcam
2. **Start Detection**: Click "Start Detection" to begin real-time emotion analysis
3. **View Results**: See detected emotions with confidence scores and real-time probability bars
4. **Stop Detection**: Click "Stop Detection" to pause analysis
5. **Stop Camera**: Click "Stop Camera" to release webcam access

## Model Information

- **Architecture**: Custom CNN (big_cnn_2)
- **Input**: 48x48 grayscale images
- **Output**: 4 emotion classes (happy, sad, neutral, surprised)
- **Model File**: `research/model_cnn_grayscale.keras`

## Technical Details

### Backend (Flask)
- **Face Detection**: OpenCV Haar Cascade
- **Image Preprocessing**: Resize to 48x48, convert to grayscale, normalize
- **Model Inference**: TensorFlow/Keras
- **API Endpoint**: `/predict` for emotion detection

### Frontend
- **Camera Access**: WebRTC getUserMedia API
- **Real-time Processing**: Canvas-based image capture
- **Responsive Design**: Modern CSS Grid and Flexbox
- **Live Updates**: Real-time emotion bars and face bounding boxes

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera permissions enabled
- HTTPS for production deployment (required for camera access)

## Performance

- **Detection Rate**: ~10 FPS
- **Model Inference**: ~0.53ms per prediction
- **Face Detection**: Real-time with Haar Cascade
- **Browser Compatibility**: All modern browsers

## File Structure

```
facial_emotion_expression/
├── app.py                 # Flask application
├── templates/
│   └── index.html        # Main webpage
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       └── main.js       # Frontend logic
├── research/
│   ├── model_cnn_grayscale.keras  # Trained model
│   └── Reference_Notebook_...     # Training notebook
├── data/                 # Training data
├── pyproject.toml        # Poetry dependencies
└── README.md
```

## Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Try refreshing the page
- Check if another application is using the camera

### Model Loading Issues
- Verify `research/model_cnn_grayscale.keras` exists
- Check TensorFlow installation: `python -c "import tensorflow; print(tensorflow.__version__)"`

### Performance Issues
- Close other applications using the camera
- Try a different browser
- Reduce detection frequency in `main.js` (increase interval)

## Deployment

### Local Development
```bash
poetry shell
python app.py
```

### Production Deployment
- Use HTTPS (required for camera access)
- Configure proper CORS headers
- Use production WSGI server (gunicorn)
- Set appropriate security headers

## License

This project is for educational purposes. Please ensure compliance with privacy laws when using camera-based applications.