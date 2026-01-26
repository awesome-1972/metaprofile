import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualEmployee, VirtualCompany } from "@/data/virtualCompanies";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  timestamp: Date;
}

interface ChatContext {
  currentTask?: string;
  currentMeeting?: string;
  completedTasks?: number;
  totalTasks?: number;
}

export const useColleagueChat = (company: VirtualCompany | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    employee: VirtualEmployee,
    context?: ChatContext
  ) => {
    if (!company || !message.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      employeeId: employee.id,
      employeeName: "Ви",
      employeeAvatar: "👤",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setActiveEmployeeId(employee.id);

    // Get conversation history for this employee
    const employeeHistory = messages
      .filter(m => m.employeeId === employee.id)
      .slice(-6) // Last 6 messages for context
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-colleague", {
        body: {
          message,
          employee: {
            name: employee.name,
            position: employee.position,
            role: employee.role,
            personality: employee.personality,
            communicationStyle: employee.communicationStyle,
          },
          company: {
            name: company.name,
            industry: company.industry,
            culture: company.culture,
          },
          context,
          conversationHistory: employeeHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeAvatar: employee.avatar,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      
      // Fallback response based on employee role
      const fallbackResponses = {
        manager: "Дякую за повідомлення. Давайте обговоримо це детальніше пізніше.",
        buddy: "Хей, бачу твоє повідомлення! Зараз трохи зайнятий, але скоро відповім детальніше 😊",
        colleague: "Окей, зрозумів. Якщо потрібна допомога - пиши.",
      };

      const fallbackMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: fallbackResponses[employee.role],
        employeeId: employee.id,
        employeeName: employee.name,
        employeeAvatar: employee.avatar,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
      
      if (error instanceof Error && error.message.includes("429")) {
        toast.error("Забагато повідомлень. Зачекайте трохи.");
      }
    } finally {
      setIsLoading(false);
      setActiveEmployeeId(null);
    }
  }, [company, messages]);

  const getMessagesForEmployee = useCallback((employeeId: string) => {
    return messages.filter(m => m.employeeId === employeeId);
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    activeEmployeeId,
    sendMessage,
    getMessagesForEmployee,
    clearMessages,
  };
};
