<template>
    <button @click="record">Record</button>
</template>
  
<script>
export default {
    methods: {
        async record() {
            // Create an audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Access the microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContext.createMediaStreamSource(stream);

            // Create a ScriptProcessorNode to analyze the audio
            const processor = audioContext.createScriptProcessor(1024, 1, 1);
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            // Create a MediaRecorder to record the audio
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });

            // Start recording
            mediaRecorder.start();

            let silenceStart = performance.now();

            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const total = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
                const rms = Math.sqrt(total / inputData.length);
                const isSilent = rms < 0.01; // Change this value to adjust sensitivity
                // If the user is speaking, start a new silence timer
                if (!isSilent) {
                    silenceStart = performance.now();
                }
                // If the silence timer exceeds a certain amount of time, stop recording
                if (isSilent && performance.now() - silenceStart > 1000) { // Stop recording after 1 second of silence and at least 2 seconds of speech
                    mediaRecorder.stop();
                    processor.disconnect();
                    source.disconnect();
                }
            };

            mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(audioChunks);
                this.sendToBackend(audioBlob);
            });
        },
        async sendToBackend(audioBlob) {
            const formData = new FormData();
            formData.append('audio', audioBlob);

            const response = await fetch('http://localhost:3000/api/convert', {
                method: 'POST',
                body: formData,
            });

            const audioBuffer = await response.arrayBuffer();
            const audioContext = new AudioContext();
            const source = audioContext.createBufferSource();
            const audioData = await audioContext.decodeAudioData(audioBuffer);

            source.buffer = audioData;
            source.connect(audioContext.destination);
            source.start();
        },
    }
};
</script>