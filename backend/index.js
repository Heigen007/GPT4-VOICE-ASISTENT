require('dotenv').config();
const express = require('express');
const multer = require('multer');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { Configuration, OpenAIApi } = require("openai");
const cors = require('cors');

const configuration = new Configuration({
    apiKey: process.env['API_KEY'],
});
const openai = new OpenAIApi(configuration);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());

app.post('/api/convert', upload.single('audio'), async (req, res) => {
    console.log("Audio was received");
    var transcription = await detectSpeech(req);
    console.log(transcription);
    var answer = await getGPTAnswer(transcription);
    console.log(answer);
    var audioContent = await textToSpeechM(answer);
    console.log("Audio was generated");

    res.set('Content-Type', 'audio/mp3');
    res.send(audioContent);
});

async function detectSpeech(req){
    const speechClient = new speech.SpeechClient();
  
    const audioBytes = req.file.buffer.toString('base64');
  
    const audio = {
      content: audioBytes,
    };
  
    const config = {
      languageCode: 'ru-RU',
    };
  
    const request = {
      audio: audio,
      config: config,
    };
  
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    return transcription;
}

async function textToSpeechM(transcription){
    const textToSpeechClient = new textToSpeech.TextToSpeechClient();
    const textToSpeechRequest = {
        input: { text: transcription },
        voice: { name: 'ru-RU-Wavenet-A', languageCode: 'ru-RU' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    const [textToSpeechResponse] = await textToSpeechClient.synthesizeSpeech(textToSpeechRequest);
    const audioContent = textToSpeechResponse.audioContent;
    return audioContent;
}

async function getGPTAnswer(question){
    const GPT35TurboMessage = [
        { role: "user", content: question }
    ];
    //gpt-4
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: GPT35TurboMessage
    });
    return response.data.choices[0].message.content
}

app.listen(3000, () => console.log('Server ready'));