
// src/components/features/voice-link/voice-link-client.tsx
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import type { SpeechSynthesisVoice } from 'react-speech-recognition'; // Assuming this type exists or define manually
import { Mic, Square, XCircle, Loader2, MessageSquareText, Info, Bot, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAgentResponseAction } from '@/app/actions/interactive-agent-actions';
import { useToast } from '@/hooks/use-toast';

// Extend window type for SpeechRecognition
interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
declare const window: IWindow;

export function VoiceLinkClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isLoadingAgentResponse, setIsLoadingAgentResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const { toast } = useToast();

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscription = '';
        let finalTranscription = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscription += event.results[i][0].transcript;
          } else {
            interimTranscription += event.results[i][0].transcript;
          }
        }
        setTranscription(prev => prev + finalTranscription + interimTranscription);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setMicrophoneError(`Speech recognition error: ${event.error}. Please try again or type your message.`);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        //
      };
    } else {
      setMicrophoneError("Speech Recognition API is not supported by your browser. Please type your message.");
      setHasMicrophonePermission(false);
    }

    const getMicrophonePermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneError("Microphone access is not supported by your browser.");
        setHasMicrophonePermission(false);
        return;
      }
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicrophonePermission(true);
        setMicrophoneError(null);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setMicrophoneError("Microphone access denied. Please enable microphone permissions in your browser settings to use voice input.");
        setHasMicrophonePermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings.',
        });
      }
    };
    getMicrophonePermission();

    // Load and select TTS voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0) {
          let bestVoice =
            voices.find(voice => voice.lang === 'en-US' && !voice.localService && voice.name.toLowerCase().includes('google')) ||
            voices.find(voice => voice.lang === 'en-US' && !voice.localService && voice.name.toLowerCase().includes('microsoft')) ||
            voices.find(voice => voice.lang === 'en-US' && !voice.localService && voice.name.toLowerCase().includes('natural')) ||
            voices.find(voice => voice.lang === 'en-US' && !voice.localService && voice.name.toLowerCase().includes('neural')) ||
            voices.find(voice => voice.lang === 'en-US' && !voice.localService) ||
            voices.find(voice => voice.lang === 'en-US' && voice.name.toLowerCase().includes('google')) ||
            voices.find(voice => voice.lang === 'en-US' && voice.name.toLowerCase().includes('microsoft')) ||
            voices.find(voice => voice.lang === 'en-US');
          
          setSelectedVoice(bestVoice || voices.find(v => v.lang.startsWith('en')) || voices[0]);
        }
      }
    };

    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }


    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSendMessage = useCallback(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const currentTranscription = transcription.trim();
    if (currentTranscription) {
      setError(null);
      setIsLoadingAgentResponse(true);
      setAgentResponse('');

      startTransition(async () => {
        try {
          const result = await getAgentResponseAction(currentTranscription);
          if (result.agentResponse.startsWith("Sorry, I encountered an error")) {
            setError(result.agentResponse);
            toast({
              title: "Response Error",
              description: result.agentResponse,
              variant: "destructive",
            });
          } else {
            setAgentResponse(result.agentResponse);
            toast({
              title: "Agent Responded",
              description: "The agent has replied to your message.",
            });

            if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
              const utterance = new SpeechSynthesisUtterance(result.agentResponse);
              if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
              } else {
                utterance.lang = 'en-US'; // Fallback language
              }
              utterance.rate = 0.9; // Slightly slower rate
              utterance.pitch = 1.0;
              utterance.volume = 1.0;
              window.speechSynthesis.speak(utterance);
            } else {
              console.warn("Text-to-speech is not supported in this browser.");
              toast({
                title: "Text-to-Speech Not Supported",
                description: "Your browser does not support speaking the agent's response.",
                variant: "default"
              });
            }
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(errorMessage);
          setAgentResponse('');
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLoadingAgentResponse(false);
        }
      });
    } else {
      setAgentResponse('');
      toast({
        title: "Empty Message",
        description: "Please type or say something to send.",
        variant: "default",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription, isRecording, toast, selectedVoice]);


  const handleToggleRecording = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (!hasMicrophonePermission) {
      setMicrophoneError("Microphone access is required. Please enable it in your browser settings and refresh the page.");
      toast({
        title: "Microphone Required",
        description: "Enable microphone permissions to use voice input.",
        variant: "destructive",
      });
      return;
    }
    if (!recognitionRef.current) {
      setMicrophoneError("Speech Recognition is not available. Try refreshing the page or use a different browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (transcription.trim()) {
        // Wait a brief moment for final transcription results
        setTimeout(() => handleSendMessage(), 100);
      }
    } else {
      setTranscription('');
      setAgentResponse('');
      setError(null);
      setMicrophoneError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak into your microphone. Tap the square to stop.",
        });
      } catch (e) {
         console.error("Error starting recognition:", e);
         setMicrophoneError("Could not start voice recognition. Please try again.");
         setIsRecording(false);
      }
    }
  };

  const handleClearText = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsRecording(false);
    setTranscription('');
    setAgentResponse('');
    setError(null);
    setMicrophoneError(null);
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    toast({
      title: "Cleared",
      description: "The text area and agent response have been cleared.",
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = transcription;
    }
  }, [transcription]);


  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-4xl tracking-tight flex items-center justify-center">
            <Bot className="w-10 h-10 mr-3 text-primary" /> Interactive Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleToggleRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={`rounded-full w-32 h-32 text-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                isRecording ? 'bg-accent animate-pulse-थो' : 'bg-primary'
              } ${!hasMicrophonePermission && hasMicrophonePermission !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-pressed={isRecording}
              aria-label={isRecording ? "Stop recording and send" : "Start recording / Open mic"}
              disabled={hasMicrophonePermission === false || (isLoadingAgentResponse || isPending)}
            >
              {hasMicrophonePermission === false ? (
                <MicOff className="w-12 h-12" />
              ) : isRecording ? (
                <Square className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground h-5">
              {hasMicrophonePermission === false ? "Microphone access denied" :
               isRecording ? "Listening... (Tap to stop & send)" :
               "Tap to talk"}
            </p>
          </div>
          
          {microphoneError && (
            <Alert variant="destructive">
              <MicOff className="h-4 w-4" />
              <AlertTitle>Microphone Error</AlertTitle>
              <AlertDescription>{microphoneError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="transcription-area" className="font-medium text-foreground font-headline text-lg flex items-center">
              <MessageSquareText className="w-5 h-5 mr-2 text-primary" />
              Your Message
            </label>
            <Textarea
              id="transcription-area"
              ref={textareaRef}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isRecording ? "Listening... (or type your message)" : "Tap the mic or type your message..."}
              rows={4}
              className="shadow-sm focus:ring-2 focus:ring-primary"
              aria-label="Your message to the agent"
              disabled={isLoadingAgentResponse || isPending}
            />
          </div>

          {error && !microphoneError && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Agent Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(isLoadingAgentResponse || isPending) && (
            <div className="flex items-center justify-center p-4 space-x-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Agent is thinking...</span>
            </div>
          )}

          {!isLoadingAgentResponse && !isPending && agentResponse && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-medium text-foreground flex items-center">
                <Bot className="w-5 h-5 mr-2 text-primary" />
                Agent's Response:
              </h3>
              <Card className="bg-muted/50 p-4 shadow-inner">
                <CardContent className="p-0">
                  <p className="text-foreground whitespace-pre-wrap">{agentResponse}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
           <Button onClick={handleSendMessage} variant="default" className="w-full sm:w-auto flex-1 shadow-sm hover:bg-primary/90 active:scale-95 transition-transform" disabled={isLoadingAgentResponse || isPending || (!transcription.trim() && !isRecording)}>
            Send Message
          </Button>
          <Button onClick={handleClearText} variant="outline" className="w-full sm:w-auto flex-1 shadow-sm hover:bg-muted active:scale-95 transition-transform" disabled={(isLoadingAgentResponse || isPending) && !isRecording}>
            <XCircle className="w-5 h-5 mr-2" />
            Clear
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Define SpeechSynthesisVoice type if not available from a library
declare global {
  interface SpeechSynthesisVoice {
    default: boolean;
    lang: string;
    localService: boolean;
    name: string;
    voiceURI: string;
  }
}
