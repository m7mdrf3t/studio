// src/components/features/voice-link/voice-link-client.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from 'react';
import { Mic, Square, XCircle, Loader2, MessageSquareText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSuggestionsAction } from '@/app/actions/voice-link-actions';
import { useToast } from '@/hooks/use-toast';

export function VoiceLinkClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      const currentTranscription = transcription.trim();
      if (currentTranscription) {
        setError(null);
        setIsLoadingSuggestions(true);
        startTransition(async () => {
          try {
            const result = await getSuggestionsAction(currentTranscription);
            if (result.suggestedActions.some(action => action.startsWith("Error:"))) {
              setError(result.suggestedActions.join(' '));
              setSuggestions([]);
              toast({
                title: "Suggestion Error",
                description: result.suggestedActions.join(' '),
                variant: "destructive",
              });
            } else {
              setSuggestions(result.suggestedActions);
               if (result.suggestedActions.length === 0) {
                toast({
                  title: "No Suggestions",
                  description: "The AI could not find any suggestions for your text.",
                });
              } else {
                 toast({
                  title: "Suggestions Loaded",
                  description: "AI suggestions have been successfully loaded.",
                });
              }
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(errorMessage);
            setSuggestions([]);
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
          } finally {
            setIsLoadingSuggestions(false);
          }
        });
      } else {
        setSuggestions([]);
        toast({
          title: "Empty Text",
          description: "Please provide some text to get suggestions.",
          variant: "default",
        });
      }
    } else {
      // Start recording
      setIsRecording(true);
      setSuggestions([]);
      setError(null);
      // Optionally clear transcription: setTranscription('');
    }
  };

  const handleClearText = () => {
    setTranscription('');
    setSuggestions([]);
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    toast({
      title: "Text Cleared",
      description: "The text area and suggestions have been cleared.",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-4xl tracking-tight">VoiceLink</CardTitle>
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
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <Square className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground h-5">
              {isRecording ? "Recording... (Tap to stop)" : "Tap to start recording (simulated)"}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="transcription-area" className="font-medium text-foreground font-headline text-lg flex items-center">
              <MessageSquareText className="w-5 h-5 mr-2 text-primary" />
              Your Text
            </label>
            <Textarea
              id="transcription-area"
              ref={textareaRef}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder={isRecording ? "Listening... (type your simulated voice input here)" : "Your transcribed text will appear here..."}
              rows={5}
              className="shadow-sm focus:ring-2 focus:ring-primary"
              aria-label="Transcription text area"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(isLoadingSuggestions || isPending) && (
            <div className="flex items-center justify-center p-4 space-x-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading suggestions...</span>
            </div>
          )}

          {!isLoadingSuggestions && !isPending && suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-medium text-foreground">Suggested Actions:</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1 shadow-sm bg-accent/20 text-accent-foreground border-accent">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleClearText} variant="outline" className="w-full shadow-sm hover:bg-muted active:scale-95 transition-transform">
            <XCircle className="w-5 h-5 mr-2" />
            Clear Text & Suggestions
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
