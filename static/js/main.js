class EmotionDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('overlay');

        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.toggleDetection = document.getElementById('toggleDetection');

        this.statusEl = document.getElementById('status');
        this.fpsEl = document.getElementById('fps');
        this.facesInfoEl = document.getElementById('facesInfo');

        // Timeline elements
        this.timelineSection = document.getElementById('timelineSection');
        this.downloadChartBtn = document.getElementById('downloadChart');
        this.clearTimelineBtn = document.getElementById('clearTimeline');

        this.stream = null;
        this.isDetecting = false;
        this.detectionInterval = null;
        this.fpsCounter = 0;
        this.lastFpsTime = Date.now();

        // Chart tracking
        this.emotionChart = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.toggleDetection.addEventListener('click', () => this.toggleEmotionDetection());

        // Timeline controls
        this.downloadChartBtn.addEventListener('click', () => this.downloadChart());
        this.clearTimelineBtn.addEventListener('click', () => this.clearTimeline());
    }

    async startCamera() {
        try {
            this.updateStatus('Starting camera...', 'active');

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = this.stream;

            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.updateStatus('Camera ready', 'active');

                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.toggleDetection.disabled = false;
            };

        } catch (error) {
            console.error('Error starting camera:', error);
            this.updateStatus(`Camera error: ${error.message}`, 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.video.srcObject = null;
        this.stopEmotionDetection();
        this.clearOverlay();

        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.toggleDetection.disabled = true;
        this.toggleDetection.textContent = 'Start Detection';

        this.updateStatus('Camera stopped', '');
        this.updateFPS(0);
        this.updateFacesInfo('No faces detected');
        this.resetEmotionBars();
    }

    toggleEmotionDetection() {
        if (this.isDetecting) {
            this.stopEmotionDetection();
        } else {
            this.startEmotionDetection();
        }
    }

    async startEmotionDetection() {
        this.isDetecting = true;
        this.toggleDetection.textContent = 'Stop Detection';
        this.updateStatus('Detecting emotions...', 'active');

        // Start emotion tracking
        try {
            await fetch('/start_tracking', { method: 'POST' });
        } catch (error) {
            console.error('Failed to start tracking:', error);
        }

        // Start detection loop at ~10 FPS
        this.detectionInterval = setInterval(() => {
            this.detectEmotions();
        }, 100);
    }

    async stopEmotionDetection() {
        this.isDetecting = false;
        this.toggleDetection.textContent = 'Start Detection';

        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Stop emotion tracking and get timeline data
        try {
            const response = await fetch('/stop_tracking', { method: 'POST' });
            const data = await response.json();

            if (data.success && data.timeline.length > 0) {
                this.displayTimeline(data.timeline);
            }
        } catch (error) {
            console.error('Failed to stop tracking:', error);
        }

        this.clearOverlay();
        this.updateStatus('Detection stopped', '');
        this.updateFPS(0);
        this.updateFacesInfo('No faces detected');
        this.resetEmotionBars();
    }

    async detectEmotions() {
        if (!this.video.videoWidth || !this.video.videoHeight) {
            return;
        }

        try {
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            // Convert canvas to base64
            const imageData = this.canvas.toDataURL('image/jpeg', 0.8);

            // Send to backend for processing
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData })
            });

            const result = await response.json();

            if (result.success) {
                this.updateFPS();
                this.displayResults(result.faces);
            } else {
                console.error('Detection error:', result.error);
                this.updateStatus(`Error: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('Request error:', error);
            this.updateStatus(`Request error: ${error.message}`, 'error');
        }
    }

    displayResults(faces) {
        this.clearOverlay();

        if (faces.length === 0) {
            this.updateFacesInfo('No faces detected');
            this.resetEmotionBars();
            return;
        }

        // Update face info
        let facesText = `${faces.length} face(s) detected:\n`;
        let avgEmotions = { happy: 0, sad: 0, neutral: 0, surprised: 0 };

        faces.forEach((face, index) => {
            // Draw face box
            this.drawFaceBox(face);

            // Update face info text
            facesText += `Face ${index + 1}: ${face.emotion} (${(face.confidence * 100).toFixed(1)}%)\n`;

            // Accumulate emotions for average
            Object.keys(avgEmotions).forEach(emotion => {
                avgEmotions[emotion] += face.probabilities[emotion] || 0;
            });
        });

        // Calculate average emotions
        Object.keys(avgEmotions).forEach(emotion => {
            avgEmotions[emotion] /= faces.length;
        });

        this.updateFacesInfo(facesText.trim());
        this.updateEmotionBars(avgEmotions);
    }

    drawFaceBox(face) {
        const videoRect = this.video.getBoundingClientRect();
        const overlayRect = this.overlay.getBoundingClientRect();

        // Calculate scale factors
        const scaleX = overlayRect.width / this.video.videoWidth;
        const scaleY = overlayRect.height / this.video.videoHeight;

        // Create face box element
        const faceBox = document.createElement('div');
        faceBox.className = 'face-box';

        const x = face.x * scaleX;
        const y = face.y * scaleY;
        const width = face.width * scaleX;
        const height = face.height * scaleY;

        faceBox.style.left = `${x}px`;
        faceBox.style.top = `${y}px`;
        faceBox.style.width = `${width}px`;
        faceBox.style.height = `${height}px`;

        // Create label
        const label = document.createElement('div');
        label.className = 'face-label';
        label.textContent = `${face.emotion} (${(face.confidence * 100).toFixed(0)}%)`;

        faceBox.appendChild(label);
        this.overlay.appendChild(faceBox);
    }

    clearOverlay() {
        this.overlay.innerHTML = '';
    }

    updateStatus(message, className = '') {
        this.statusEl.textContent = message;
        this.statusEl.className = `status ${className}`;
    }

    updateFPS(fps = null) {
        if (fps !== null) {
            this.fpsEl.textContent = `FPS: ${fps}`;
            return;
        }

        this.fpsCounter++;
        const now = Date.now();

        if (now - this.lastFpsTime >= 1000) {
            const currentFPS = Math.round(this.fpsCounter * 1000 / (now - this.lastFpsTime));
            this.fpsEl.textContent = `FPS: ${currentFPS}`;
            this.fpsCounter = 0;
            this.lastFpsTime = now;
        }
    }

    updateFacesInfo(text) {
        if (text === 'No faces detected') {
            this.facesInfoEl.innerHTML = '<div class="faces-info">No faces detected</div>';
        } else {
            const lines = text.split('\n');
            let html = '';

            lines.forEach(line => {
                if (line.includes('face(s) detected:')) {
                    html += `<div class="face-info"><strong>${line}</strong></div>`;
                } else {
                    const match = line.match(/Face (\d+): (\w+) \((.+)%\)/);
                    if (match) {
                        const [, faceNum, emotion, confidence] = match;
                        html += `<div class="face-info">
                            <span class="face-emotion">${emotion}</span>
                            <span class="face-confidence"> - ${confidence}% confidence</span>
                        </div>`;
                    }
                }
            });

            this.facesInfoEl.innerHTML = html;
        }
    }

    updateEmotionBars(emotions) {
        Object.keys(emotions).forEach(emotion => {
            const fill = document.querySelector(`.emotion-fill[data-emotion="${emotion}"]`);
            const percent = document.querySelector(`.emotion-percent[data-emotion="${emotion}"]`);

            if (fill && percent) {
                const percentage = Math.round(emotions[emotion] * 100);
                fill.style.width = `${percentage}%`;
                percent.textContent = `${percentage}%`;
            }
        });
    }

    resetEmotionBars() {
        document.querySelectorAll('.emotion-fill').forEach(fill => {
            fill.style.width = '0%';
        });

        document.querySelectorAll('.emotion-percent').forEach(percent => {
            percent.textContent = '0%';
        });
    }

    displayTimeline(timeline) {
        // Show timeline section
        this.timelineSection.style.display = 'block';
        this.timelineSection.scrollIntoView({ behavior: 'smooth' });

        this.createEmotionChart(timeline);
    }

    createEmotionChart(timeline) {
        // Destroy existing chart
        if (this.emotionChart) {
            this.emotionChart.destroy();
        }

        // Prepare data
        const labels = timeline.map(point => `${point.timestamp.toFixed(1)}s`);
        const emotionColors = {
            happy: '#fbbf24',
            sad: '#3b82f6',
            neutral: '#6b7280',
            surprised: '#8b5cf6'
        };

        // Create chart context
        const chartCtx = document.getElementById('emotionChart').getContext('2d');

        // Create datasets for each emotion
        const datasets = Object.keys(emotionColors).map(emotion => ({
            label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
            data: timeline.map(point => {
                const value = (point.emotions[emotion] * 100);
                return Math.max(0, Math.min(100, value));
            }),
            borderColor: emotionColors[emotion],
            backgroundColor: emotionColors[emotion] + '20',
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2
        }));

        this.emotionChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Emotion Confidence Over Time'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Confidence (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    downloadChart() {
        if (this.emotionChart) {
            const link = document.createElement('a');
            link.download = `emotion-timeline-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = this.emotionChart.toBase64Image();
            link.click();
        }
    }

    clearTimeline() {
        if (confirm('Are you sure you want to clear the emotion timeline?')) {
            this.timelineSection.style.display = 'none';
            if (this.emotionChart) {
                this.emotionChart.destroy();
                this.emotionChart = null;
            }
        }
    }
}

// Initialize the emotion detector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const detector = new EmotionDetector();

    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('status').textContent = 'Camera not supported in this browser';
        document.getElementById('status').className = 'status error';
        document.getElementById('startBtn').disabled = true;
    }
});