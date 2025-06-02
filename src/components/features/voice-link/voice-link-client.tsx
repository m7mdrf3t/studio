// src/components/features/voice-link/voice-link-client.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from 'react';
import { Mic, Square, XCircle, Loader2, MessageSquareText, Info, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAgentResponseAction } from '@/app/actions/interactive-agent-actions';
import { useToast } from '@/hooks/use-toast';

export function VoiceLinkClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isLoadingAgentResponse, setIsLoadingAgentResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isRecording]);

  const handleSendMessage = () => {
    // This function is called when the user stops "recording" or submits text
    setIsRecording(false); // Stop "recording" UI state
    const currentTranscription = transcription.trim();
    if (currentTranscription) {
      setError(null);
      setIsLoadingAgentResponse(true);
      setAgentResponse(''); // Clear previous response
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
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleSendMessage(); // Send the message when stopping recording
    } else {
      // Start recording
      setIsRecording(true);
      setAgentResponse('');
      setError(null);
      // Optionally clear transcription: setTranscription('');
      if (textareaRef.current) {
         textareaRef.current.focus();
      }
      toast({
        title: "Voice Input (Simulated)",
        description: "This is a simulated voice input. Please type your message in the text area below.",
      });
    }
  };

  const handleClearText = () => {
    setTranscription('');
    setAgentResponse('');
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    toast({
      title: "Cleared",
      description: "The text area and agent response have been cleared.",
    });
  };

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
              }`}
              aria-pressed={isRecording}
              aria-label={isRecording ? "Stop recording and send" : "Start recording / Open mic"}
            >
              {isRecording ? (
                <Square className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground h-5">
              {isRecording ? "Recording... (Tap to stop & send)" : "Tap to talk (simulated)"}
            </p>
          </div>

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
              placeholder={isRecording ? "Listening... (type your message here)" : "Type your message to the agent..."}
              rows={4}
              className="shadow-sm focus:ring-2 focus:ring-primary"
              aria-label="Your message to the agent"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
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
           <Button onClick={handleSendMessage} variant="default" className="w-full sm:w-auto flex-1 shadow-sm hover:bg-primary/90 active:scale-95 transition-transform" disabled={isLoadingAgentResponse || isPending || !transcription.trim()}>
            Send Message
          </Button>
          <Button onClick={handleClearText} variant="outline" className="w-full sm:w-auto flex-1 shadow-sm hover:bg-muted active:scale-95 transition-transform">
            <XCircle className="w-5 h-5 mr-2" />
            Clear
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
