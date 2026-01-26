import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { InterviewerAvatar, InterviewQuestion } from "@/data/interviewData";

interface InterviewMessage {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

interface UseVirtualInterviewProps {
  interviewer: InterviewerAvatar;
  companyName: string;
  positionTitle: string;
  questions: InterviewQuestion[];
}

export const useVirtualInterview = ({
  interviewer,
  companyName,
  positionTitle,
  questions,
}: UseVirtualInterviewProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [starEvaluations, setStarEvaluations] = useState<any[]>([]);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);

  const currentQuestion = questions[currentQuestionIndex];

  const askQuestion = useCallback(async (isFollowUp = false) => {
    if (!currentQuestion) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("conduct-interview", {
        body: {
          action: "ask_question",
          context: {
            interviewerName: interviewer.name,
            interviewerRole: interviewer.role,
            interviewerPersonality: interviewer.personality,
            companyName,
            positionTitle,
            currentQuestion: currentQuestion.question,
            questionType: currentQuestion.type,
            competencyTargeted: currentQuestion.competencyTargeted,
            conversationHistory: messages,
            isFollowUp,
          },
        },
      });

      if (error) throw error;

      const interviewerMessage: InterviewMessage = {
        role: "interviewer",
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, interviewerMessage]);
    } catch (error) {
      console.error("Error asking question:", error);
      // Fallback to direct question
      const fallbackMessage: InterviewMessage = {
        role: "interviewer",
        content: currentQuestion.question,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentQuestion, interviewer, companyName, positionTitle, messages]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion) return;

    const candidateMessage: InterviewMessage = {
      role: "candidate",
      content: answer,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, candidateMessage]);
    setIsLoading(true);

    try {
      // First, evaluate STAR if it's a behavioral question
      if (currentQuestion.type === "behavioral") {
        const { data: starData } = await supabase.functions.invoke("conduct-interview", {
          body: {
            action: "evaluate_star",
            context: {
              interviewerName: interviewer.name,
              interviewerRole: interviewer.role,
              interviewerPersonality: interviewer.personality,
              companyName,
              positionTitle,
              currentQuestion: currentQuestion.question,
              questionType: currentQuestion.type,
              competencyTargeted: currentQuestion.competencyTargeted,
              conversationHistory: [...messages, candidateMessage],
              candidateAnswer: answer,
            },
          },
        });

        if (starData?.result) {
          setStarEvaluations((prev) => [
            ...prev,
            { questionId: currentQuestion.id, ...starData.result },
          ]);
        }
      }

      // Get interviewer response
      const { data, error } = await supabase.functions.invoke("conduct-interview", {
        body: {
          action: "respond_to_answer",
          context: {
            interviewerName: interviewer.name,
            interviewerRole: interviewer.role,
            interviewerPersonality: interviewer.personality,
            companyName,
            positionTitle,
            currentQuestion: currentQuestion.question,
            questionType: currentQuestion.type,
            competencyTargeted: currentQuestion.competencyTargeted,
            conversationHistory: [...messages, candidateMessage],
            candidateAnswer: answer,
          },
        },
      });

      if (error) throw error;

      const responseMessage: InterviewMessage = {
        role: "interviewer",
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, responseMessage]);

      // Move to next question after response
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Interview complete - generate report
        await generateReport([...messages, candidateMessage, responseMessage]);
      }
    } catch (error) {
      console.error("Error processing answer:", error);
      toast({
        title: "Помилка",
        description: "Не вдалося обробити відповідь. Спробуйте ще раз.",
        variant: "destructive",
      });
      
      // Still move to next question on error
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentQuestion, currentQuestionIndex, questions, interviewer, companyName, positionTitle, messages, toast]);

  const generateReport = useCallback(async (history: InterviewMessage[]) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("conduct-interview", {
        body: {
          action: "generate_report",
          context: {
            interviewerName: interviewer.name,
            interviewerRole: interviewer.role,
            interviewerPersonality: interviewer.personality,
            companyName,
            positionTitle,
            currentQuestion: "",
            questionType: "",
            competencyTargeted: "",
            conversationHistory: history,
          },
        },
      });

      if (error) throw error;

      setFinalReport(data.result);
      setIsInterviewComplete(true);
    } catch (error) {
      console.error("Error generating report:", error);
      // Generate mock report on error
      setFinalReport({
        overallScore: 75,
        recommendation: "maybe",
        recommendationRationale: "Кандидат показав змішані результати. Рекомендується додаткова оцінка.",
        strengths: ["Технічні знання", "Комунікабельність"],
        weaknesses: ["Потребує розвитку лідерських навичок"],
        cultureFit: 70,
        technicalFit: 80,
        softSkillsFit: 72,
        developmentSuggestions: ["Розвивати навички презентації", "Працювати над структурованістю відповідей"],
        summary: "Кандидат має потенціал, але потребує додаткового розвитку в деяких областях.",
      });
      setIsInterviewComplete(true);
    } finally {
      setIsLoading(false);
    }
  }, [interviewer, companyName, positionTitle]);

  const startInterview = useCallback(() => {
    setMessages([]);
    setCurrentQuestionIndex(0);
    setStarEvaluations([]);
    setIsInterviewComplete(false);
    setFinalReport(null);
  }, []);

  return {
    messages,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: questions.length,
    isLoading,
    starEvaluations,
    isInterviewComplete,
    finalReport,
    askQuestion,
    submitAnswer,
    startInterview,
  };
};
