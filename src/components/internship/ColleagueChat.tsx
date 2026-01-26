import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VirtualEmployee, VirtualCompany, VirtualOffice } from "@/data/virtualCompanies";
import { useColleagueChat } from "@/hooks/useColleagueChat";
import { cn } from "@/lib/utils";

interface ColleagueChatProps {
  company: VirtualCompany;
  office: VirtualOffice;
  completedTasks: string[];
  currentTask?: string;
}

export const ColleagueChat = ({ 
  company, 
  office, 
  completedTasks,
  currentTask 
}: ColleagueChatProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<VirtualEmployee | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    activeEmployeeId, 
    sendMessage, 
    getMessagesForEmployee 
  } = useColleagueChat(company);

  const employeeMessages = selectedEmployee 
    ? getMessagesForEmployee(selectedEmployee.id) 
    : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [employeeMessages]);

  const handleSend = async () => {
    if (!selectedEmployee || !inputMessage.trim() || isLoading) return;

    const message = inputMessage;
    setInputMessage("");

    await sendMessage(message, selectedEmployee, {
      currentTask,
      completedTasks: completedTasks.length,
      totalTasks: office.tasks.length,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleBadge = (role: VirtualEmployee["role"]) => {
    switch (role) {
      case "manager":
        return <Badge variant="default" className="text-xs">👔 Керівник</Badge>;
      case "buddy":
        return <Badge variant="secondary" className="text-xs">🤝 Buddy</Badge>;
      case "colleague":
        return <Badge variant="outline" className="text-xs">👥 Колега</Badge>;
    }
  };

  const getUnreadCount = (employeeId: string) => {
    const empMessages = getMessagesForEmployee(employeeId);
    // Show indicator if there are messages from this employee
    const hasMessages = empMessages.some(m => m.role === "assistant");
    return hasMessages ? empMessages.filter(m => m.role === "assistant").length : 0;
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          💬 Чат з командою
          {selectedEmployee && (
            <span className="text-sm font-normal text-muted-foreground">
              • {selectedEmployee.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {!selectedEmployee ? (
          // Employee selector
          <div className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Оберіть колегу для спілкування:
            </p>
            {office.employees.map((emp) => {
              const msgCount = getUnreadCount(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
                >
                  <span className="text-2xl">{emp.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {emp.name}
                      </span>
                      {msgCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {msgCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.position}
                    </p>
                  </div>
                  {getRoleBadge(emp.role)}
                </button>
              );
            })}
          </div>
        ) : (
          // Chat view
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ← Назад
              </button>
              <span className="text-xl">{selectedEmployee.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {selectedEmployee.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedEmployee.position}
                </p>
              </div>
              {getRoleBadge(selectedEmployee.role)}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-3" ref={scrollRef}>
              <div className="py-3 space-y-3">
                {employeeMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p className="mb-2">👋 Почніть розмову з {selectedEmployee.name}</p>
                    <p className="text-xs">
                      {selectedEmployee.role === "buddy" && "Ваш наставник готовий допомогти!"}
                      {selectedEmployee.role === "manager" && "Поставте питання керівнику"}
                      {selectedEmployee.role === "colleague" && "Колега може поділитися досвідом"}
                    </p>
                  </div>
                )}
                
                {employeeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-lg flex-shrink-0">{msg.employeeAvatar}</span>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent/80 text-foreground"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {msg.timestamp.toLocaleTimeString("uk-UA", { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && activeEmployeeId === selectedEmployee.id && (
                  <div className="flex gap-2 items-center">
                    <span className="text-lg">{selectedEmployee.avatar}</span>
                    <div className="bg-accent/80 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>друкує...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2 flex-shrink-0">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Написати ${selectedEmployee.name}...`}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
