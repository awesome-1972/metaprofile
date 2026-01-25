import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, Send, Users, Target, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string;
  avatar?: string;
}

interface CompetencyModelOption {
  id: string;
  name: string;
  competenciesCount: number;
  duration: string;
}

// Demo data
const demoCandidates: Candidate[] = [
  { id: "1", name: "Олена Коваленко", email: "olena@example.com", position: "Frontend Developer" },
  { id: "2", name: "Андрій Мельник", email: "andrii@example.com", position: "Product Manager" },
  { id: "3", name: "Марія Шевченко", email: "maria@example.com", position: "UX Designer" },
  { id: "4", name: "Іван Петренко", email: "ivan@example.com", position: "Backend Developer" },
  { id: "5", name: "Наталія Бондар", email: "natalia@example.com", position: "QA Engineer" },
];

const demoModels: CompetencyModelOption[] = [
  { id: "1", name: "Senior Developer Assessment", competenciesCount: 6, duration: "45 хв" },
  { id: "2", name: "Product Manager Evaluation", competenciesCount: 5, duration: "40 хв" },
  { id: "3", name: "UX Designer Skills", competenciesCount: 7, duration: "50 хв" },
];

interface AssignAssessmentProps {
  preselectedCandidateId?: string;
  preselectedModelId?: string;
}

export const AssignAssessment = ({
  preselectedCandidateId,
  preselectedModelId,
}: AssignAssessmentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>(
    preselectedCandidateId ? [preselectedCandidateId] : []
  );
  const [selectedModel, setSelectedModel] = useState(preselectedModelId || "");
  const [message, setMessage] = useState("");
  const [deadline, setDeadline] = useState("");

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (selectedCandidates.length === 0) {
      toast.error("Оберіть хоча б одного кандидата");
      return;
    }
    if (!selectedModel) {
      toast.error("Оберіть модель компетенцій");
      return;
    }

    // Here would be API call to assign assessment
    const modelName = demoModels.find((m) => m.id === selectedModel)?.name;
    toast.success(
      `Оцінку "${modelName}" призначено ${selectedCandidates.length} кандидат(ам)`
    );
    setIsOpen(false);
    setSelectedCandidates([]);
    setSelectedModel("");
    setMessage("");
  };

  const selectedModelData = demoModels.find((m) => m.id === selectedModel);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Призначити оцінку
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Призначення оцінки компетенцій
          </DialogTitle>
          <DialogDescription>
            Оберіть кандидатів та модель компетенцій для проведення оцінювання
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Модель компетенцій *
            </Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть модель для оцінювання" />
              </SelectTrigger>
              <SelectContent>
                {demoModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {model.competenciesCount} компетенцій
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedModelData && (
              <div className="p-3 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Обрана модель:</span>
                  <span className="font-medium text-foreground">{selectedModelData.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Орієнтовний час:</span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" />
                    {selectedModelData.duration}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Candidates selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Кандидати *
              </Label>
              {selectedCandidates.length > 0 && (
                <Badge variant="secondary">{selectedCandidates.length} обрано</Badge>
              )}
            </div>

            <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
              {demoCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedCandidates.includes(candidate.id) ? "bg-primary/5" : ""
                  }`}
                  onClick={() => toggleCandidate(candidate.id)}
                >
                  <Checkbox
                    checked={selectedCandidates.includes(candidate.id)}
                    onCheckedChange={() => toggleCandidate(candidate.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {candidate.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{candidate.position}</p>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {candidate.email}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Супровідне повідомлення (необов'язково)
            </Label>
            <Textarea
              id="message"
              placeholder="Додайте персональне повідомлення для кандидатів..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedCandidates.length > 0 && selectedModel && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm font-medium text-foreground mb-2">Підсумок призначення:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Модель: <span className="text-foreground">{selectedModelData?.name}</span>
                </li>
                <li>
                  • Кандидатів:{" "}
                  <span className="text-foreground">{selectedCandidates.length}</span>
                </li>
                <li>
                  • Кожен отримає email-запрошення з посиланням на тест
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={handleAssign} className="gap-2">
            <Send className="h-4 w-4" />
            Надіслати запрошення
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
