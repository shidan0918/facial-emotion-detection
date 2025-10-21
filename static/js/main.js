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

        // Video analysis elements
        this.startCameraVideoBtn = document.getElementById('startCameraVideo');
        this.stopCameraVideoBtn = document.getElementById('stopCameraVideo');
        this.startVideoAnalysisBtn = document.getElementById('startVideoAnalysis');
        this.stopVideoAnalysisBtn = document.getElementById('stopVideoAnalysis');
        this.syncStatusEl = document.getElementById('syncStatus');

        this.stream = null;
        this.isDetecting = false;
        this.detectionInterval = null;
        this.fpsCounter = 0;
        this.lastFpsTime = Date.now();

        // Chart tracking
        this.emotionChart = null;

        // Video analysis tracking
        this.youtubePlayer = null;
        this.videoStartTime = null;
        this.isVideoAnalysis = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.toggleDetection.addEventListener('click', () => this.toggleEmotionDetection());

        // Timeline controls
        this.downloadChartBtn.addEventListener('click', () => this.downloadChart());
        this.clearTimelineBtn.addEventListener('click', () => this.clearTimeline());

        // Video analysis controls
        this.startCameraVideoBtn.addEventListener('click', () => this.startCameraForVideo());
        this.stopCameraVideoBtn.addEventListener('click', () => this.stopCameraForVideo());
        this.startVideoAnalysisBtn.addEventListener('click', () => this.startVideoAnalysis());
        this.stopVideoAnalysisBtn.addEventListener('click', () => this.stopVideoAnalysis());
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

    async startCameraForVideo() {
        try {
            this.updateSyncStatus('Starting camera...', 'active');

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
            };

            this.startCameraVideoBtn.disabled = true;
            this.stopCameraVideoBtn.disabled = false;
            this.startVideoAnalysisBtn.disabled = false;

            this.updateSyncStatus('Camera ready - now start video analysis', '');

        } catch (error) {
            console.error('Camera access failed:', error);
            this.updateSyncStatus('Camera access failed', 'error');
        }
    }

    stopCameraForVideo() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.video.srcObject = null;
        this.clearOverlay();

        this.startCameraVideoBtn.disabled = false;
        this.stopCameraVideoBtn.disabled = true;
        this.startVideoAnalysisBtn.disabled = true;
        this.stopVideoAnalysisBtn.disabled = true;

        // Stop any ongoing analysis
        if (this.isVideoAnalysis) {
            this.stopVideoAnalysis();
        }

        this.updateSyncStatus('Camera stopped', '');
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

    // Video Analysis Methods
    async startVideoAnalysis() {
        try {
            // Check if camera is already running, if not, return early
            if (!this.stream) {
                this.updateSyncStatus('Please start camera first', 'error');
                return;
            }

            // Initialize YouTube player if not already done
            if (!this.youtubePlayer) {
                this.initializeYouTubePlayer();
                return; // Player will call this method again once ready
            }

            this.isVideoAnalysis = true;
            this.startVideoAnalysisBtn.disabled = true;
            this.stopVideoAnalysisBtn.disabled = false;

            this.updateSyncStatus('Starting synchronized analysis...', 'active');

            // Start emotion tracking
            await fetch('/start_tracking', { method: 'POST' });
            this.videoStartTime = Date.now();

            // Start detection loop
            this.detectionInterval = setInterval(() => {
                this.detectEmotions();
            }, 100);

            // Start video playback
            if (this.youtubePlayer && this.youtubePlayer.playVideo) {
                this.youtubePlayer.playVideo();
            }

            this.updateSyncStatus('Recording emotions while video plays', 'active');

        } catch (error) {
            console.error('Error starting video analysis:', error);
            this.updateSyncStatus('Error starting analysis', 'error');
        }
    }

    async stopVideoAnalysis() {
        this.isVideoAnalysis = false;
        this.startVideoAnalysisBtn.disabled = false;
        this.stopVideoAnalysisBtn.disabled = true;

        // Stop video playback
        if (this.youtubePlayer && this.youtubePlayer.pauseVideo) {
            this.youtubePlayer.pauseVideo();
        }

        // Stop detection
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Stop tracking and get timeline data
        try {
            const response = await fetch('/stop_tracking', { method: 'POST' });
            const data = await response.json();

            if (data.success && data.timeline.length > 0) {
                this.displayVideoTimeline(data.timeline, data.happy_score);
            }
        } catch (error) {
            console.error('Failed to stop tracking:', error);
        }

        this.updateSyncStatus('Analysis complete - view timeline below', '');
    }

    initializeYouTubePlayer() {
        this.youtubePlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: 'eVMNvm67Y-A', // YouTube Shorts video ID
            playerVars: {
                'autoplay': 0,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onReady': (event) => {
                    console.log('YouTube player ready');
                    this.updateSyncStatus('Video ready - click Start Video Analysis', '');
                },
                'onStateChange': (event) => {
                    this.onYouTubePlayerStateChange(event);
                }
            }
        });
    }

    onYouTubePlayerStateChange(event) {
        // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
        if (event.data === YT.PlayerState.ENDED && this.isVideoAnalysis) {
            // Video ended, stop analysis
            this.stopVideoAnalysis();
        } else if (event.data === YT.PlayerState.PAUSED && this.isVideoAnalysis) {
            // Video paused, pause emotion detection
            if (this.detectionInterval) {
                clearInterval(this.detectionInterval);
                this.detectionInterval = null;
            }
            this.updateSyncStatus('Video paused - emotion tracking paused', 'warning');
        } else if (event.data === YT.PlayerState.PLAYING && this.isVideoAnalysis) {
            // Video resumed, resume emotion detection
            if (!this.detectionInterval) {
                this.detectionInterval = setInterval(() => {
                    this.detectEmotions();
                }, 100);
            }
            this.updateSyncStatus('Recording emotions while video plays', 'active');
        }
    }

    displayVideoTimeline(timeline, happyScore = null) {
        // Show timeline section
        this.timelineSection.style.display = 'block';
        this.timelineSection.scrollIntoView({ behavior: 'smooth' });

        // Update header with happy score if provided
        if (happyScore !== null) {
            const headerEl = this.timelineSection.querySelector('.timeline-header p');
            headerEl.innerHTML = `Your emotion journey during the detection session<br><strong>🎭 Total Happy Score: ${happyScore}%</strong> of the video`;
        }

        this.createVideoSyncChart(timeline);
    }

    createVideoSyncChart(timeline) {
        // Destroy existing chart
        if (this.emotionChart) {
            this.emotionChart.destroy();
        }

        // Prepare data with video timeline sync
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
                        text: 'Your Emotional Response to Video Over Time'
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
                            text: 'Emotion Confidence (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Video Time (seconds)'
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

    updateSyncStatus(message, className = '') {
        this.syncStatusEl.textContent = message;
        this.syncStatusEl.className = `status ${className}`;
    }
}

// YouTube API callback
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube IFrame API Ready');
    // The player will be initialized when needed
};

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