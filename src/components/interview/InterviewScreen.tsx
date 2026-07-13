import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InterviewCompletionResult } from "@/types/interview";
import {
  Send, 
  Mic, 
  MicOff, 
  User, 
  MessageSquare,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterviewerAvatar, InterviewQuestion } from "@/data/interviewData";
import { useVirtualInterview } from "@/hooks/useVirtualInterview";
import { InterviewReport } from "./InterviewReport";
import { AnimatedInterviewerAvatar } from "./AnimatedInterviewerAvatar";

interface InterviewScreenProps {
  interviewer: InterviewerAvatar;
  companyName: string;
  positionTitle: string;
  questions: InterviewQuestion[];
  interviewType: "training" | "real";
  onComplete: (result: InterviewCompletionResult) => void;
  onExit: () => void;
}

export const InterviewScreen = ({
  interviewer,
  companyName,
  positionTitle,
  questions,
  interviewType,
  onComplete,
  onExit,
}: InterviewScreenProps) => {
  const [inputValue, setInputValue] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const {
    messages,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isLoading,
    isInterviewComplete,
    finalReport,
    askQuestion,
    submitAnswer,
    startInterview,
  } = useVirtualInterview({
    interviewer,
    companyName,
    positionTitle,
    questions,
  });

  const handleStart = async () => {
    startInterview();
    setHasStarted(true);
    // Wait a moment then ask first question
    setTimeout(() => {
      askQuestion();
    }, 500);
  };

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return;
    submitAnswer(inputValue.trim());
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAskNextQuestion = () => {
    askQuestion();
  };

  // Show report when interview is complete
  if (isInterviewComplete && finalReport) {
    return (
      <InterviewReport
        report={finalReport}
        positionTitle={positionTitle}
        companyName={companyName}
        interviewType={interviewType}
        onClose={onExit}
        onSendToCompany={interviewType === "real" ? () => onComplete({ report: finalReport, messages }) : undefined}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={interviewer.photo} alt={interviewer.name} />
            <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{interviewer.name}</p>
            <p className="text-sm text-muted-foreground">
              {interviewer.role} • {companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant={interviewType === "real" ? "destructive" : "secondary"}>
            {interviewType === "real" ? "🔴 Запис" : "Тренування"}
          </Badge>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Питання {currentQuestionIndex + 1} з {totalQuestions}
            </p>
            <Progress 
              value={((currentQuestionIndex + 1) / totalQuestions) * 100} 
              className="w-32 h-2"
            />
          </div>

          <Button variant="outline" size="sm" onClick={onExit}>
            Завершити
          </Button>
        </div>
      </div>

      {/* Main interview area */}
      <div className="flex-1 flex">
        {/* Interviewer video area with animated avatar */}
        <div className="w-1/2 bg-muted/30 flex items-center justify-center relative border-r border-border">
          <div className="text-center">
            {/* Animated AI Avatar */}
            <AnimatedInterviewerAvatar
              photo={interviewer.photo}
              name={interviewer.name}
              isSpeaking={isLoading}
              className="mb-4"
            />

            <h3 className="text-lg font-medium text-foreground">{interviewer.name}</h3>
            <p className="text-sm text-muted-foreground">{interviewer.role}</p>
            <p className="text-xs text-muted-foreground mt-1">{interviewer.department}</p>
          </div>

          {/* Interview not started overlay */}
          {!hasStarted && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-center p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Співбесіда на позицію
                </h2>
                <p className="text-xl text-primary mb-4">{positionTitle}</p>
                <p className="text-muted-foreground mb-6">
                  Ваш інтерв'юер: {interviewer.name}
                </p>
                <Button size="lg" onClick={handleStart}>
                  Розпочати співбесіду
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Chat/transcript area */}
        <div className="w-1/2 flex flex-col bg-background">
          <div className="p-3 border-b border-border bg-accent/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Діалог</span>
            </div>
            {currentQuestion && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {currentQuestion.type === "behavioral" && "Поведінкове"}
                  {currentQuestion.type === "technical" && "Технічне"}
                  {currentQuestion.type === "situational" && "Ситуаційне"}
                  {currentQuestion.type === "competency" && "Компетенційне"}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  • {currentQuestion.competencyTargeted}
                </span>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "candidate" ? "flex-row-reverse" : ""
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {message.role === "interviewer" ? (
                      <>
                        <AvatarImage src={interviewer.photo} />
                        <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === "candidate"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      message.role === "candidate" 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    )}>
                      {new Date(message.timestamp).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={interviewer.photo} />
                    <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          {hasStarted && (
            <div className="p-4 border-t border-border">
              {messages.length > 0 && messages[messages.length - 1].role === "interviewer" && !isLoading && (
                <div className="flex gap-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введіть вашу відповідь..."
                    className="min-h-[80px] resize-none"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsRecording(!isRecording)}
                      className={cn(isRecording && "bg-destructive text-destructive-foreground")}
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSubmit}
                      disabled={!inputValue.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {messages.length > 0 && messages[messages.length - 1].role === "candidate" && !isLoading && (
                <Button onClick={handleAskNextQuestion} className="w-full">
                  {currentQuestionIndex < totalQuestions - 1 ? "Наступне питання" : "Завершити співбесіду"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
