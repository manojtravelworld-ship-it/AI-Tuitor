import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Hand, Sparkles, X, RotateCcw, Volume2, Maximize2, Minimize2, Cpu, Zap, GripVertical, PenLine, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceVisualizer } from './VoiceVisualizer';

// ─── Handwriting Glyph Engine (ported from math-board-handwriting) ──────────
const NS = "http://www.w3.org/2000/svg";

const GLYPHS: Record<string, { strokes: string[]; width: number; duration: number; gapAfterStroke?: number }> = {
  "0": { strokes: ["M 18 4 C 4 4, 2 20, 2 30 C 2 42, 6 56, 18 56 C 30 56, 32 42, 32 28 C 32 16, 28 4, 18 4 Z"], width: 32, duration: 560 },
  "1": { strokes: ["M 6 14 C 12 10, 16 6, 18 2 L 18 56"], width: 22, duration: 420 },
  "2": { strokes: ["M 4 18 C 4 8, 16 2, 24 8 C 32 14, 28 24, 18 34 C 10 42, 4 48, 2 54 L 30 54"], width: 34, duration: 550 },
  "3": { strokes: ["M 2 12 C 8 2, 26 2, 26 14 C 26 22, 18 26, 14 27 C 20 28, 30 32, 28 42 C 26 54, 6 56, 2 46"], width: 30, duration: 620 },
  "4": { strokes: ["M 24 2 L 2 36 L 30 36", "M 22 22 L 22 56"], width: 32, duration: 520, gapAfterStroke: 70 },
  "5": { strokes: ["M 26 4 L 4 4 L 2 26 C 10 18, 26 20, 28 34 C 30 48, 16 58, 4 48"], width: 30, duration: 600 },
  "6": { strokes: ["M 26 4 C 10 14, 2 30, 4 42 C 6 54, 20 58, 28 48 C 34 40, 28 28, 18 28 C 10 28, 4 34, 4 42"], width: 34, duration: 620 },
  "7": { strokes: ["M 0 8 L 32 8 C 24 22, 14 38, 10 56"], width: 34, duration: 480 },
  "8": { strokes: ["M 16 4 C 6 4, 4 12, 10 18 C 16 24, 28 26, 30 38 C 32 50, 18 58, 8 52 C 0 46, 2 36, 12 30 C 22 24, 30 18, 24 8 C 20 2, 10 2, 6 8"], width: 32, duration: 680 },
  "9": { strokes: ["M 28 26 C 28 14, 16 8, 8 16 C 0 24, 6 36, 16 34 C 26 32, 28 18, 24 8 C 20 0, 10 -2, 4 6"], width: 32, duration: 620 },
  "x": { strokes: ["M 4 22 C 14 34, 22 44, 30 56", "M 30 22 C 20 34, 12 44, 4 56"], width: 34, duration: 480, gapAfterStroke: 90 },
  "y": { strokes: ["M 4 22 C 10 32, 14 40, 18 48 C 20 54, 18 62, 10 62", "M 28 22 C 22 32, 18 40, 16 46"], width: 32, duration: 560, gapAfterStroke: 90 },
  "+": { strokes: ["M 17 8 L 17 50", "M -3 28 L 37 28"], width: 38, duration: 380, gapAfterStroke: 80 },
  "-": { strokes: ["M 0 28 L 30 28"], width: 30, duration: 220 },
  "=": { strokes: ["M 0 20 L 36 20", "M 0 38 L 36 38"], width: 40, duration: 340, gapAfterStroke: 70 },
  "*": { strokes: ["M 4 14 C 10 22, 16 28, 22 36", "M 22 14 C 16 22, 10 28, 4 36"], width: 26, duration: 360, gapAfterStroke: 70 },
  "/": { strokes: ["M 28 2 L 2 56"], width: 30, duration: 380 },
  "(": { strokes: ["M 22 0 C 6 14, 4 42, 22 58"], width: 24, duration: 420 },
  ")": { strokes: ["M 4 0 C 20 14, 22 42, 4 58"], width: 24, duration: 420 },
  ".": { strokes: ["M 4 52 C 4 49, 8 49, 8 52 C 8 55, 4 55, 4 52 Z"], width: 12, duration: 160 },
  ",": { strokes: ["M 4 50 C 4 47, 8 47, 8 50 C 8 54, 4 58, 2 60"], width: 12, duration: 220 },
  "^": { strokes: ["M 0 14 L 10 2 L 20 14"], width: 22, duration: 280 },
  " ": { strokes: [], width: 18, duration: 0 },
  // Letters
  "a": { strokes: ["M 26 20 C 18 14, 4 16, 2 30 C 0 44, 14 52, 24 44 C 28 40, 28 24, 28 50"], width: 30, duration: 480 },
  "b": { strokes: ["M 4 0 L 4 56", "M 4 26 C 14 16, 28 20, 28 36 C 28 50, 14 54, 4 46"], width: 30, duration: 540, gapAfterStroke: 60 },
  "c": { strokes: ["M 28 22 C 18 12, 2 18, 2 34 C 2 48, 18 54, 28 44"], width: 30, duration: 440 },
  "d": { strokes: ["M 28 0 L 28 56", "M 28 26 C 18 16, 4 20, 4 36 C 4 50, 18 54, 28 46"], width: 30, duration: 540, gapAfterStroke: 60 },
  "e": { strokes: ["M 2 32 L 28 32 C 28 16, 6 12, 2 28 C -2 44, 14 56, 26 46"], width: 30, duration: 480 },
  "f": { strokes: ["M 24 2 C 14 0, 8 6, 8 16 L 8 56", "M 2 22 L 22 22"], width: 26, duration: 460, gapAfterStroke: 60 },
  "g": { strokes: ["M 28 20 C 20 12, 4 14, 2 30 C 0 46, 14 56, 26 48 L 28 60 C 26 72, 12 74, 4 66"], width: 30, duration: 560 },
  "h": { strokes: ["M 4 0 L 4 56", "M 4 28 C 14 14, 30 18, 30 34 L 30 56"], width: 32, duration: 500, gapAfterStroke: 60 },
  "i": { strokes: ["M 14 20 L 14 56", "M 12 10 C 12 6, 18 6, 18 10 C 18 14, 12 14, 12 10 Z"], width: 18, duration: 340, gapAfterStroke: 50 },
  "j": { strokes: ["M 16 20 L 16 52 C 16 62, 6 64, 2 56", "M 14 10 C 14 6, 20 6, 20 10 C 20 14, 14 14, 14 10 Z"], width: 20, duration: 380, gapAfterStroke: 50 },
  "k": { strokes: ["M 4 0 L 4 56", "M 28 20 L 6 38", "M 14 34 L 28 56"], width: 30, duration: 480, gapAfterStroke: 50 },
  "l": { strokes: ["M 10 0 L 10 48 C 10 56, 18 56, 22 50"], width: 24, duration: 400 },
  "m": { strokes: ["M 4 22 L 4 56", "M 4 28 C 10 16, 22 16, 22 28 L 22 56", "M 22 28 C 28 16, 40 16, 40 28 L 40 56"], width: 42, duration: 560, gapAfterStroke: 50 },
  "n": { strokes: ["M 4 18 L 4 56", "M 4 26 C 12 14, 28 18, 28 30 L 28 56"], width: 30, duration: 460, gapAfterStroke: 50 },
  "o": { strokes: ["M 16 14 C 4 14, 2 26, 2 36 C 2 48, 8 56, 18 56 C 28 56, 32 48, 32 36 C 32 22, 26 14, 16 14 Z"], width: 34, duration: 520 },
  "p": { strokes: ["M 4 20 L 4 70", "M 4 26 C 14 14, 28 18, 28 34 C 28 48, 14 52, 4 44"], width: 30, duration: 540, gapAfterStroke: 60 },
  "q": { strokes: ["M 28 20 L 28 70", "M 28 26 C 18 14, 4 18, 4 34 C 4 50, 18 54, 28 46"], width: 30, duration: 540, gapAfterStroke: 60 },
  "r": { strokes: ["M 4 20 L 4 56", "M 4 28 C 10 16, 22 14, 28 20"], width: 28, duration: 380, gapAfterStroke: 60 },
  "s": { strokes: ["M 26 22 C 18 12, 2 14, 2 26 C 2 36, 18 36, 24 44 C 30 54, 12 58, 2 50"], width: 28, duration: 520 },
  "t": { strokes: ["M 14 2 L 14 48 C 14 56, 22 56, 26 50", "M 2 18 L 26 18"], width: 28, duration: 440, gapAfterStroke: 60 },
  "u": { strokes: ["M 4 20 L 4 44 C 4 56, 18 58, 26 48 L 26 20"], width: 30, duration: 440 },
  "v": { strokes: ["M 2 20 L 14 56 L 26 20"], width: 28, duration: 380 },
  "w": { strokes: ["M 2 20 L 10 56 L 18 34 L 26 56 L 34 20"], width: 36, duration: 480 },
  "z": { strokes: ["M 2 20 L 26 20 L 2 56 L 26 56"], width: 28, duration: 420 },
  "!": { strokes: ["M 12 4 L 12 40", "M 10 50 C 10 46, 16 46, 16 50 C 16 54, 10 54, 10 50 Z"], width: 18, duration: 300, gapAfterStroke: 60 },
  "?": { strokes: ["M 2 14 C 4 4, 22 2, 22 14 C 22 22, 14 26, 12 36", "M 10 50 C 10 46, 16 46, 16 50 C 16 54, 10 54, 10 50 Z"], width: 24, duration: 460, gapAfterStroke: 60 },
  ":": { strokes: ["M 8 18 C 8 14, 14 14, 14 18 C 14 22, 8 22, 8 18 Z", "M 8 44 C 8 40, 14 40, 14 44 C 14 48, 8 48, 8 44 Z"], width: 18, duration: 280, gapAfterStroke: 80 },
};

function hwPathLength(d: string): number {
  const svgTmp = document.createElementNS(NS, 'svg');
  svgTmp.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  document.body.appendChild(svgTmp);
  const tmp = document.createElementNS(NS, 'path');
  tmp.setAttribute('d', d);
  svgTmp.appendChild(tmp);
  const len = tmp.getTotalLength();
  document.body.removeChild(svgTmp);
  return len;
}

function hwSleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function hwAnimateStroke(path: SVGPathElement, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const len = parseFloat(path.style.getPropertyValue('--len'));
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2.2);
      path.style.strokeDashoffset = String(len * (1 - eased));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// Draws a single character into an existing SVG at xOffset, returns new xOffset
async function hwDrawChar(
  svg: SVGSVGElement,
  char: string,
  xOffset: number,
  scale: number,
  lineHeight: number,
  speed: number,
  color: string,
  cancelRef: React.MutableRefObject<boolean>
): Promise<number> {
  const glyph = GLYPHS[char.toLowerCase()] || GLYPHS[char];
  if (!glyph || glyph.strokes.length === 0) {
    return xOffset + (glyph?.width ?? 12) * scale + 3;
  }
  if (cancelRef.current) return xOffset;

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', `translate(${xOffset}, 0) scale(${scale})`);
  svg.appendChild(g);

  for (let i = 0; i < glyph.strokes.length; i++) {
    if (cancelRef.current) return xOffset;
    const d = glyph.strokes[i];
    const len = hwPathLength(d);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.style.setProperty('--len', String(len));
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.style.filter = `drop-shadow(0 0 2px ${color}44)`;
    g.appendChild(path);
    const dur = (glyph.duration / glyph.strokes.length) / speed;
    await hwAnimateStroke(path, dur);
    if (i < glyph.strokes.length - 1) {
      await hwSleep((glyph.gapAfterStroke || 70) / speed);
    }
  }
  return xOffset + (glyph.width * scale) + 3;
}

// ─── Component Interface ──────────────────────────────────────────────────────

interface MicrophoneCameraPanelProps {
  onVolumeChange: (vol: number) => void;
  isModelSpeaking: boolean;
  isThinking: boolean;
  onRaiseHand?: () => void;
  isHandRaised?: boolean;
  triggerAIResponse?: (prompt: string, speaker: string, callback: (res: string) => void) => void;
  triggerAIResponseStream?: (
    prompt: string,
    speaker: string,
    onChunk: (chunk: string) => void,
    onDone: (full: string) => void
  ) => void;
}

export const MicrophoneCameraPanel: React.FC<MicrophoneCameraPanelProps> = ({
  onVolumeChange,
  isModelSpeaking: appIsSpeaking,
  isThinking: appIsThinking,
  onRaiseHand,
  isHandRaised = false,
  triggerAIResponse,
  triggerAIResponseStream,
}) => {
  // ─── Core mic / camera states ────────────────────────────────────────────
  const [micEnabled, setMicEnabled] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState('Click mic and ask a question...');
  const [aiReply, setAiReply] = useState('');
  const [displayedReply, setDisplayedReply] = useState('');
  const [isLocalThinking, setIsLocalThinking] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [speakLang, setSpeakLang] = useState<'en-US' | 'ml-IN'>('en-US');
  const [cameraScale, setCameraScale] = useState<'normal' | 'large'>('normal');
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // ─── Display mode: normal typewriter vs handwriting board ────────────────
  const [displayMode, setDisplayMode] = useState<'normal' | 'handwriting'>('normal');

  // ─── Handwriting board state ─────────────────────────────────────────────
  const hwBoardRef = useRef<HTMLDivElement | null>(null);
  const hwCancelRef = useRef(false);
  const hwSpeedRef = useRef(3.5); // fast enough for streaming feel
  // Buffer of chars waiting to be drawn
  const hwQueueRef = useRef<string[]>([]);
  const hwDrawingRef = useRef(false);
  // Current SVG row state
  const hwCurrentSvgRef = useRef<SVGSVGElement | null>(null);
  const hwCurrentXRef = useRef(4);
  const hwLineWidthRef = useRef(460); // approx board inner width
  const hwScaleRef = useRef(0.48);
  const hwLineHeightRef = useRef(40);
  const hwCurrentColorRef = useRef('#f0ece0');
  const hwStreamingRef = useRef(false); // true while AI is still streaming

  // ─── Refs ────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const handleVoiceQueryRef = useRef<any>(null);
  const stateRef = useRef({ micEnabled, isThinking: false, isModelSpeaking: false });

  const isThinking = appIsThinking || isLocalThinking;
  const isModelSpeaking = appIsSpeaking || isLocalSpeaking;

  useEffect(() => { handleVoiceQueryRef.current = handleVoiceQuery; });
  useEffect(() => { stateRef.current = { micEnabled, isThinking, isModelSpeaking }; }, [micEnabled, isThinking, isModelSpeaking]);

  // Re-initialise recognition when language switches
  useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (micEnabled) {
      initSpeechRecognition();
      try { recognitionRef.current?.start(); } catch {}
    }
  }, [speakLang]); // eslint-disable-line

  // ─── Handwriting engine helpers ──────────────────────────────────────────

  function hwStartNewRow(board: HTMLDivElement): SVGSVGElement {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;min-height:${hwLineHeightRef.current + 10}px;flex:0 0 auto;`;
    board.appendChild(row);
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('height', String(hwLineHeightRef.current));
    svg.setAttribute('width', String(hwLineWidthRef.current));
    svg.setAttribute('viewBox', `0 0 ${hwLineWidthRef.current} ${hwLineHeightRef.current}`);
    svg.style.overflow = 'visible';
    row.appendChild(svg);
    return svg;
  }

  // Drain the char queue onto the board, one char at a time
  const hwDrainQueue = useCallback(async () => {
    if (hwDrawingRef.current) return;
    hwDrawingRef.current = true;
    const board = hwBoardRef.current;
    if (!board) { hwDrawingRef.current = false; return; }

    while (hwQueueRef.current.length > 0 && !hwCancelRef.current) {
      const char = hwQueueRef.current.shift()!;

      if (char === '\n' || hwCurrentXRef.current > hwLineWidthRef.current - 30) {
        // Start a new row
        hwCurrentSvgRef.current = hwStartNewRow(board);
        hwCurrentXRef.current = 4;
        hwCurrentColorRef.current = '#f0ece0';
        if (char === '\n') {
          await hwSleep(80 / hwSpeedRef.current);
          continue;
        }
      }

      if (!hwCurrentSvgRef.current) {
        hwCurrentSvgRef.current = hwStartNewRow(board);
        hwCurrentXRef.current = 4;
      }

      const newX = await hwDrawChar(
        hwCurrentSvgRef.current,
        char,
        hwCurrentXRef.current,
        hwScaleRef.current,
        hwLineHeightRef.current,
        hwSpeedRef.current,
        hwCurrentColorRef.current,
        hwCancelRef
      );
      hwCurrentXRef.current = newX;

      // Update SVG viewBox to actual drawn width
      hwCurrentSvgRef.current.setAttribute('width', String(Math.max(newX + 8, 40)));

      // Auto-scroll
      board.scrollTop = board.scrollHeight;
    }
    hwDrawingRef.current = false;

    // If streaming is done and queue is empty, highlight final line golden
    if (!hwStreamingRef.current && hwCurrentSvgRef.current) {
      const paths = hwCurrentSvgRef.current.querySelectorAll('path');
      paths.forEach(p => {
        p.setAttribute('stroke', '#e8c468');
        p.style.filter = 'drop-shadow(0 0 3px rgba(232,196,104,0.5))';
      });
    }
  }, []);

  // Push chars from a chunk into the queue and kick the drain loop
  const hwEnqueueChunk = useCallback((chunk: string) => {
    for (const ch of chunk) {
      hwQueueRef.current.push(ch);
    }
    hwDrainQueue();
  }, [hwDrainQueue]);

  function hwResetBoard() {
    hwCancelRef.current = true;
    hwQueueRef.current = [];
    hwDrawingRef.current = false;
    hwCurrentSvgRef.current = null;
    hwCurrentXRef.current = 4;
    if (hwBoardRef.current) hwBoardRef.current.innerHTML = '';
    setTimeout(() => { hwCancelRef.current = false; }, 50);
  }

  // ─── AI query handler ────────────────────────────────────────────────────

  async function handleVoiceQuery(queryText: string) {
    if (!queryText.trim() || queryText === 'Listening...') return;
    setIsLocalThinking(true);
    setAiReply('');
    setDisplayedReply('');

    if (displayMode === 'handwriting') {
      hwResetBoard();
      hwStreamingRef.current = true;
    }

    const isMalayalam = speakLang === 'ml-IN';
    const formattedPrompt = isMalayalam
      ? `നിങ്ങൾ OpenVidya-യിലെ ഒരു AI അധ്യാപകനാണ്. വിദ്യാർഥി ചോദിച്ചു: "${queryText}". ദയവായി മലയാളത്തിൽ മാത്രം മൂന്ന് വാക്യങ്ങളിൽ വ്യക്തമായി ഉത്തരം നൽകുക. markdown, bullets, special symbols ഉപയോഗിക്കരുത്.`
      : `You are an intelligent voice tutor in OpenVidya. The student asked: "${queryText}". Give a brief, clear, academic explanation in plain text only. No markdown, no bullet points, no special symbols. Max 3 sentences.`;

    // Try streaming first
    if (triggerAIResponseStream && displayMode === 'handwriting') {
      triggerAIResponseStream(
        formattedPrompt,
        'teacher',
        (chunk) => {
          // chunk arrives while AI is generating
          setIsLocalThinking(false);
          const clean = chunk.replace(/[*#`_\[\]()${}\\]/g, '').replace(/\n+/g, ' ');
          hwEnqueueChunk(clean);
        },
        (full) => {
          hwStreamingRef.current = false;
          setAiReply(full);
          speakResponse(full);
          // Drain any remaining queue
          hwDrainQueue();
        }
      );
    } else if (triggerAIResponse) {
      // Non-streaming path — start typewriter immediately when response arrives
      triggerAIResponse(formattedPrompt, 'teacher', (response) => {
        setIsLocalThinking(false);
        setAiReply(response);
        if (displayMode === 'handwriting') {
          const clean = response.replace(/\*\(Answered by [^*]+\)\*/gi, '').replace(/[*#`_\[\]()${}\\]/g, '').replace(/\n+/g, ' ').slice(0, 400);
          hwStreamingRef.current = false;
          hwEnqueueChunk(clean);
        }
        speakResponse(response);
      });
    } else {
      setTimeout(() => {
        setIsLocalThinking(false);
        const reply = "Energy is conserved in all closed systems. Total potential energy equals final kinetic energy minus frictional heat loss.";
        setAiReply(reply);
        if (displayMode === 'handwriting') {
          hwStreamingRef.current = false;
          hwEnqueueChunk(reply);
        }
        speakResponse(reply);
      }, 1200);
    }
  }

  // ─── Normal typewriter effect (unchanged) ────────────────────────────────
  useEffect(() => {
    if (displayMode !== 'normal') return;
    if (!aiReply) { setDisplayedReply(''); return; }
    const cleanText = aiReply
      .replace(/\*\(Answered by [^*]+\)\*/gi, '')
      .replace(/[#*`_\[\]()${}\\]/g, '')
      .replace(/mathbf/g, '')
      .slice(0, 500);
    let i = 0;
    setDisplayedReply('');
    // Show first chunk immediately for instant feel
    const firstChunk = cleanText.slice(0, 20);
    setDisplayedReply(firstChunk);
    i = firstChunk.length;
    const timer = setInterval(() => {
      if (i < cleanText.length) {
        setDisplayedReply(prev => prev + cleanText.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 18); // slightly faster than before
    return () => clearInterval(timer);
  }, [aiReply, displayMode]);

  // ─── Speech synthesis ────────────────────────────────────────────────────
  function speakResponse(text: string) {
    // Short ping sound to signal response arrival
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}

    // Delay TTS slightly so App.tsx's cancel() calls (from its own speakOutput path) can't race us
    setTimeout(() => {
      try {
        window.speechSynthesis.cancel();
        const cleanText = text
          .replace(/\*\(Answered by [^*]+\)\*/gi, '')
          .replace(/[#*`_\[\]()${}\\]/g, '')
          .replace(/mathbf/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = speakLang;
        utterance.rate = speakLang === 'ml-IN' ? 0.88 : 0.95;
        utterance.pitch = speakLang === 'ml-IN' ? 1.0 : 1.05;

        // For Malayalam, try to pick a Malayalam voice explicitly
        if (speakLang === 'ml-IN') {
          const voices = window.speechSynthesis.getVoices();
          const mlVoice = voices.find(v => v.lang === 'ml-IN') ||
                          voices.find(v => v.lang.startsWith('ml')) ||
                          voices.find(v => v.name.toLowerCase().includes('malayalam'));
          if (mlVoice) utterance.voice = mlVoice;
        }

        utterance.onstart = () => setIsLocalSpeaking(true);
        utterance.onend = () => setIsLocalSpeaking(false);
        utterance.onerror = (e) => {
          // 'interrupted' fires when cancel() was called — not a real error
          if ((e as any).error !== 'interrupted') setIsLocalSpeaking(false);
        };

        // Chrome bug workaround: speechSynthesis silently stops after ~15s unless resumed
        const resumeTimer = setInterval(() => {
          if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
          else clearInterval(resumeTimer);
        }, 10000);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setIsLocalSpeaking(false);
      }
    }, 120); // 120ms is enough to win the cancel race
  }

  const handleClearAll = () => {
    setAiReply(''); setDisplayedReply('');
    setTranscript('Click mic and ask a question...');
    window.speechSynthesis.cancel(); setIsLocalSpeaking(false);
    if (displayMode === 'handwriting') hwResetBoard();
  };

  // ─── Speech recognition ──────────────────────────────────────────────────
  const initSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;
    const rec = new SpeechRecognitionClass();
    rec.continuous = false; rec.interimResults = true; rec.lang = speakLang;
    rec.onstart = () => setTranscript('Listening...');
    rec.onresult = (event: any) => {
      consecutiveErrorsRef.current = 0;
      let interim = ''; let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) { setTranscript(final); if (handleVoiceQueryRef.current) handleVoiceQueryRef.current(final); }
      else if (interim) setTranscript(interim);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') { setTranscript('Speak now...'); consecutiveErrorsRef.current += 1; }
      else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setTranscript('Mic restricted. Use preset buttons or type below.'); consecutiveErrorsRef.current = 999; }
      else { setTranscript(`Error: ${e.error}. Try typing below.`); consecutiveErrorsRef.current += 1; }
      if (consecutiveErrorsRef.current >= 3) { setMicEnabled(false); onVolumeChange(0); setMicLevel(0); try { recognitionRef.current?.stop(); } catch {} }
    };
    rec.onend = () => {
      if (stateRef.current.micEnabled && consecutiveErrorsRef.current < 3 && !stateRef.current.isThinking && !stateRef.current.isModelSpeaking) {
        try { rec.start(); } catch {}
      }
    };
    recognitionRef.current = rec;
  };

  const toggleMic = async () => {
    if (micEnabled) {
      setMicEnabled(false); onVolumeChange(0); setMicLevel(0); setTranscript('Mic off.');
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch {}
      micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }
    try {
      consecutiveErrorsRef.current = 0;
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mediaStream;
      setupAudioAnalysis(mediaStream);
      setMicEnabled(true); setTranscript('Listening...');
      if (!recognitionRef.current) initSpeechRecognition();
      try { recognitionRef.current?.start(); } catch {}
    } catch {
      setMicEnabled(true); setTranscript('Listening (Simulation mode)...');
      simulateMicActivity();
    }
  };

  const setupAudioAnalysis = (mediaStream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      audioContext.createMediaStreamSource(mediaStream).connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = audioContext; analyserRef.current = analyser; dataArrayRef.current = dataArray;
      const draw = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
        const normalized = Math.min(sum / dataArrayRef.current.length / 128, 1);
        setMicLevel(normalized); onVolumeChange(normalized);
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      animationFrameRef.current = requestAnimationFrame(draw);
    } catch { simulateMicActivity(); }
  };

  const simulateMicActivity = () => {
    const timer = setInterval(() => {
      if (micEnabled) { const rand = Math.random() > 0.4 ? Math.random() * 0.3 : 0; setMicLevel(rand); onVolumeChange(rand); }
      else clearInterval(timer);
    }, 150);
  };

  const toggleCamera = async () => {
    if (cameraEnabled) {
      setCameraEnabled(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      stream?.getTracks().forEach(t => t.stop()); setStream(null);
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
      setStream(mediaStream); setCameraEnabled(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = mediaStream; }, 100);
    } catch { setCameraEnabled(true); }
  };

  const triggerCameraScan = async () => {
    setIsScanning(true); setScanResult('Scanning document...');
    const scanPrompt = `You are an AI classroom document scanner in OpenVidya. Analyze the student's note page or textbook. Give a concise explanation highlighting formulas or diagrams.`;
    if (triggerAIResponse) {
      triggerAIResponse(scanPrompt, 'system', (res) => { setIsScanning(false); setScanResult(res); });
    } else {
      setTimeout(() => { setIsScanning(false); setScanResult("### Scanner Analysis\n- **Formula Detected:** F = ma\n- Newton's Second Law of Motion."); }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stream?.getTracks().forEach(t => t.stop());
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(() => {});
    };
  }, [stream]);

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {micEnabled && (
          <div className="fixed bottom-48 md:bottom-[210px] right-4 md:right-12 z-50 w-[calc(100vw-2rem)] max-w-[440px] pointer-events-none">
            <motion.div
              drag dragMomentum={false} dragElastic={0.05} whileDrag={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.92 }}
              className="bg-[#050915]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 md:p-6 w-full md:w-[480px] shadow-[0_30px_70px_rgba(0,0,0,0.85)] flex flex-col gap-4 pointer-events-auto cursor-grab active:cursor-grabbing hover:border-indigo-500/30 transition-colors relative overflow-hidden"
            >
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-500/5 blur-[30px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/5 blur-[30px] rounded-full pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 z-10 select-none">
                <div className="flex items-center gap-2">
                  <div className="text-white/20 mr-0.5 cursor-grab active:cursor-grabbing hover:text-white/40"><GripVertical className="w-3.5 h-3.5" /></div>
                  <div className={`h-2 w-2 rounded-full ${micEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300">Secure Voice Channel</span>
                </div>
                <div className="flex items-center gap-1.5 z-10">
                  {/* Language Toggle */}
                  <div className="flex items-center gap-1 bg-slate-900/80 border border-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => { setSpeakLang('en-US'); handleClearAll(); }}
                      title="English"
                      className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${speakLang === 'en-US' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >EN</button>
                    <button
                      onClick={() => { setSpeakLang('ml-IN'); handleClearAll(); }}
                      title="Malayalam"
                      className={`px-2 py-1 rounded text-[9px] font-black transition-all ${speakLang === 'ml-IN' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >മല</button>
                  </div>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 bg-slate-900/80 border border-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => { setDisplayMode('normal'); handleClearAll(); }}
                      title="Normal text mode"
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${displayMode === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      <AlignLeft className="w-3 h-3" /> Text
                    </button>
                    <button
                      onClick={() => { setDisplayMode('handwriting'); handleClearAll(); }}
                      title="Handwriting board mode"
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${displayMode === 'handwriting' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >
                      <PenLine className="w-3 h-3" /> Board
                    </button>
                  </div>
                  <button onClick={() => { try { recognitionRef.current?.stop(); } catch {} toggleMic(); setTimeout(() => toggleMic(), 300); }} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all" title="Restart listening"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setMicEnabled(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-rose-400 transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Volume Visualizer */}
              <div className="py-2 flex flex-col items-center gap-3 z-10">
                <VoiceVisualizer volume={micLevel} isModelSpeaking={isModelSpeaking} isThinking={isThinking} isConnected={micEnabled} />
                <div className="text-center font-medium text-slate-200 text-xs px-4 min-h-[2.5rem] flex flex-col items-center justify-center gap-1">
                  <span className="italic">{transcript === 'Listening...' ? (speakLang === 'ml-IN' ? 'ഇപ്പോൾ സംസാരിക്കൂ... പ്രൊഫ. വിക്രം കേൾക്കുന്നു.' : 'Speak now... Professor Vikram is listening.') : `"${transcript}"`}</span>
                  {transcript === 'Listening...' && <span className="text-[9px] text-slate-400 font-normal">🎙️ Sandbox blocked? Click "Fix Mic/Voice (New Tab)" at top right!</span>}
                </div>
              </div>

              {/* Quick presets */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-2 z-10 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Quick Voice Test Prompts</span>
                  <span className="text-[8px] text-slate-500 font-medium">Click to simulate speaking</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {(speakLang === 'ml-IN'
                    ? ['നമസ്കാരം, കേൾക്കുന്നുണ്ടോ?', 'പ്ലാങ്കിന്റെ നിയമം എന്താണ്?', 'ഫാരഡേയുടെ നിയമം വിശദീകരിക്കൂ']
                    : ['hello can you hear me', "Explain Planck's Formula", "What is Faraday's Law?"]
                  ).map((preset, idx) => (
                    <button key={idx} type="button"
                      onClick={() => { setTranscript(preset); handleVoiceQuery(preset); }}
                      className="px-2.5 py-1.5 bg-black/50 hover:bg-indigo-950/40 border border-white/5 hover:border-indigo-500/30 text-[10px] font-semibold text-slate-300 rounded-xl transition-all text-left sm:text-center truncate"
                    >🗣️ "{preset}"</button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const q = fd.get('questionText') as string; if (q?.trim()) { setTranscript(q); handleVoiceQuery(q); e.currentTarget.reset(); } }}
                className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-2xl p-1.5 z-10 relative">
                <input type="text" name="questionText" placeholder="Or type a question here..." className="bg-transparent text-xs text-slate-200 placeholder-slate-500 flex-1 px-3 py-1 outline-none min-w-0" />
                <button type="submit" disabled={isThinking} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-white shrink-0">Ask AI</button>
              </form>

              {/* Transcript */}
              {transcript && transcript !== 'Listening...' && (
                <div className="text-xs font-semibold text-indigo-300 italic tracking-wide max-h-20 overflow-y-auto custom-scrollbar select-text leading-relaxed px-1 z-10">"{transcript}"</div>
              )}

              {/* ── ANSWER DISPLAY AREA ── */}
              {(aiReply || isThinking || hwQueueRef.current.length > 0) && (
                <div className={`border rounded-2xl flex flex-col gap-2 z-10 relative overflow-hidden ${displayMode === 'handwriting' ? 'bg-[#1a2420] border-[#3d4a44]' : 'bg-[#0c0f1b]/95 border-indigo-500/10 p-4 max-h-48 overflow-y-auto custom-scrollbar'}`}>

                  {/* Header bar */}
                  <div className={`flex items-center justify-between gap-2 ${displayMode === 'handwriting' ? 'px-3 pt-2.5 pb-1 border-b border-[#3d4a44]/60' : 'border-b border-white/5 pb-2 mb-1'}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 select-none ${displayMode === 'handwriting' ? 'text-[#e8c468]' : 'text-amber-500'}`}>
                      {displayMode === 'handwriting' ? <PenLine className="w-3 h-3" /> : <Sparkles className="w-3 h-3 animate-pulse" />}
                      {displayMode === 'handwriting' ? 'Handwriting Board' : 'Professor Vikram Response'}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {aiReply && (
                        <button onClick={() => speakResponse(aiReply)} className="text-[9px] font-black uppercase text-amber-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-amber-500/20 px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                          <span>🔊 Speak</span>
                        </button>
                      )}
                      <button onClick={handleClearAll} className="text-[9px] font-bold uppercase text-rose-400 hover:text-rose-300 bg-white/5 hover:bg-white/10 border border-white/5 px-2.5 py-1 rounded-lg transition-all">Clear</button>
                    </div>
                  </div>

                  {/* Normal mode: typewriter text */}
                  {displayMode === 'normal' && (
                    <div className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-serif italic text-left tracking-wide">
                      {displayedReply}
                      {isThinking && !displayedReply && (
                        <span className="inline-flex gap-0.5 items-end h-3 ml-1">
                          <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms] h-1.5" />
                          <span className="w-0.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:150ms] h-2.5" />
                          <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms] h-1.5" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Handwriting mode: SVG board */}
                  {displayMode === 'handwriting' && (
                    <div
                      ref={hwBoardRef}
                      style={{
                        background: '#1a2420',
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 4px)',
                        minHeight: 80,
                        maxHeight: 200,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '8px 10px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        position: 'relative',
                      }}
                    >
                      {/* Thinking indicator on the board itself */}
                      {isThinking && (
                        <div style={{ color: '#6b7a72', fontSize: 11, padding: '4px 2px', fontStyle: 'italic' }}>
                          ✏️ writing...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Thinking state when no reply yet */}
              {isThinking && !aiReply && displayMode === 'normal' && (
                <div className="bg-[#0b0f19]/60 border border-indigo-500/5 rounded-xl p-2.5 flex items-center gap-2 animate-pulse z-10">
                  <div className="flex gap-0.5 h-2.5 items-end shrink-0">
                    <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms] h-1.5" />
                    <span className="w-0.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:150ms] h-2.5" />
                    <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms] h-1.5" />
                  </div>
                  <p className="text-[9px] text-indigo-300 italic font-bold uppercase tracking-wider">Professor Vikram is formulating response...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera feed */}
      <AnimatePresence>
        {cameraEnabled && (
          <div className="fixed bottom-48 md:bottom-[210px] right-4 md:right-12 z-50 w-[calc(100vw-2rem)] max-w-[340px] md:max-w-none md:w-auto pointer-events-none">
            <motion.div
              drag dragMomentum={false} dragElastic={0.05} whileDrag={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className={`bg-slate-950/95 backdrop-blur-2xl border-2 border-slate-800 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300 w-full pointer-events-auto cursor-grab active:cursor-grabbing hover:border-emerald-500/30 ${cameraScale === 'large' ? 'md:w-[420px] md:h-[480px] h-[400px]' : 'md:w-[290px] md:h-[340px] h-[300px]'}`}
            >
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-slate-500 cursor-grab"><GripVertical className="w-3.5 h-3.5 opacity-70" /></div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Classroom Vision Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCameraScale(cameraScale === 'large' ? 'normal' : 'large')} className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-all">{cameraScale === 'large' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => setCameraEnabled(false)} className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex-1 bg-black relative min-h-0 flex items-center justify-center">
                {stream ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : (
                  <div className="p-4 text-center"><Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-500 animate-pulse" /><p className="text-[11px] font-bold text-white">Active Vision Track</p><p className="text-[9px] text-slate-500 mt-1">Live camera tracking</p></div>
                )}
                {scanResult && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                      <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase">Scan Explanation</span>
                      <button onClick={() => setScanResult('')} className="text-[9px] text-slate-400 hover:text-white bg-slate-900 px-2 py-0.5 rounded-full">Reset</button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{scanResult}</p>
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                    <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase animate-pulse">Running OCR & AI Analysis</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-900/20 border-t border-slate-900 flex gap-2">
                <button onClick={triggerCameraScan} disabled={isScanning} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15">
                  <Cpu className="w-3.5 h-3.5" /> Scan Textbook / Notes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating control capsule */}
      <div className="fixed bottom-24 md:bottom-28 right-4 md:right-12 flex flex-col items-end gap-4 z-50 w-auto px-4 pointer-events-none">
        <motion.div drag dragMomentum={false} dragElastic={0.05} whileDrag={{ scale: 1.05 }}
          className="bg-black/95 backdrop-blur-3xl p-2.5 sm:p-3.5 rounded-full border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.95)] flex items-center justify-center gap-3 md:gap-4 cursor-grab active:cursor-grabbing pointer-events-auto hover:border-indigo-500/30 transition-all"
        >
          <div className="text-white/20 hover:text-white/40 cursor-grab mr-0.5 flex items-center justify-center shrink-0 animate-pulse"><GripVertical className="w-4 h-4 md:w-5 md:h-5" /></div>
          <button onClick={toggleCamera}
            className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 cursor-pointer ${cameraEnabled ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] transform scale-105' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'}`}
          >
            <svg className="w-4.5 h-4.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          {micEnabled ? (
            <button onClick={toggleMic} className="w-12 h-12 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all duration-300 bg-rose-500 border-2 border-rose-400 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer transform hover:scale-105 active:scale-95 shrink-0"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          ) : (
            <button onClick={toggleMic} className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 cursor-pointer bg-rose-500/10 border-rose-500/20 text-rose-500 hover:text-rose-400 hover:bg-rose-500/20 shrink-0">
              <svg className="w-4.5 h-4.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
          )}
          {onRaiseHand && (
            <button onClick={onRaiseHand}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 cursor-pointer ${isHandRaised ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transform scale-105 animate-bounce' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'}`}
            ><Hand className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" /></button>
          )}
          <div className="hidden sm:block h-8 w-px bg-white/10 mx-1 shrink-0" />
          <div className="hidden sm:flex flex-col select-none min-w-[70px] shrink-0 text-left">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400 leading-none">NEXUS LINK</span>
            <span className="text-[8px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${micEnabled || cameraEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className={micEnabled || cameraEnabled ? 'text-emerald-400' : 'text-slate-500'}>{micEnabled || cameraEnabled ? 'ACTIVE' : 'OFFLINE'}</span>
            </span>
          </div>
        </motion.div>
      </div>
    </>
  );
};
