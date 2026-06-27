
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function speakText(text: string) {
  window.speechSynthesis.cancel();
  
  const voices = window.speechSynthesis.getVoices();
  console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`));

  const speak = () => {
    console.log("Attempting to speak:", text);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a Malayalam voice
    const malayalamVoice = voices.find(v => v.lang.toLowerCase().includes('ml'));

    if (text.match(/[\u0D00-\u0D7F]/) && malayalamVoice) {
      console.log("Using Malayalam voice:", malayalamVoice.name);
      utterance.voice = malayalamVoice;
    } else {
      console.log("Using English voice");
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => console.log("Speech started");
    utterance.onerror = (event) => console.error("Speech error:", event.error);
    
    window.speechSynthesis.speak(utterance);
  };

  // Ensure voices are loaded
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      speak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    speak();
  }
}
