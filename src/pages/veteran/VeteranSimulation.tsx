import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Target,
  Users,
  MessageSquare,
  Brain,
  Briefcase,
  Award,
  RotateCcw,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

interface Simulation {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: "easy" | "medium" | "hard";
  skillsTested: string[];
  completed: boolean;
  score?: number;
}

interface Question {
  id: number;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  skill: string;
}

const simulations: Simulation[] = [
  {
    id: "team-leadership",
    title: "Управління командою",
    description: "Симуляція керування проєктною командою з 5 осіб у стресовій ситуації",
    category: "Лідерство",
    duration: "20 хв",
    difficulty: "medium",
    skillsTested: ["Лідерство", "Комунікація", "Прийняття рішень"],
    completed: true,
    score: 92,
  },
  {
    id: "crisis-management",
    title: "Кризовий менеджмент",
    description: "Реагування на критичну ситуацію в офісі: евакуація та координація",
    category: "Безпека",
    duration: "15 хв",
    difficulty: "hard",
    skillsTested: ["Кризовий менеджмент", "Швидке прийняття рішень", "Стресостійкість"],
    completed: true,
    score: 98,
  },
  {
    id: "project-planning",
    title: "Планування проєкту",
    description: "Розробка плану проєкту з обмеженими ресурсами та дедлайнами",
    category: "Менеджмент",
    duration: "25 хв",
    difficulty: "medium",
    skillsTested: ["Планування", "Аналітика", "Ресурсний менеджмент"],
    completed: false,
  },
  {
    id: "conflict-resolution",
    title: "Вирішення конфліктів",
    description: "Медіація конфлікту між членами команди з різними поглядами",
    category: "Комунікація",
    duration: "15 хв",
    difficulty: "medium",
    skillsTested: ["Комунікація", "Емоційний інтелект", "Переговори"],
    completed: false,
  },
  {
    id: "client-negotiation",
    title: "Переговори з клієнтом",
    description: "Ведення складних переговорів з вимогливим клієнтом",
    category: "Комунікація",
    duration: "20 хв",
    difficulty: "hard",
    skillsTested: ["Переговори", "Презентація", "Стратегічне мислення"],
    completed: false,
  },
  {
    id: "technical-problem",
    title: "Технічна проблема",
    description: "Діагностика та усунення технічної несправності в системі",
    category: "Технічні",
    duration: "15 хв",
    difficulty: "easy",
    skillsTested: ["Аналітика", "Технічні навички", "Системне мислення"],
    completed: false,
  },
];

const sampleQuestions: Question[] = [
  {
    id: 1,
    text: "Ваша команда зіткнулася з терміновим дедлайном, але один з ключових співробітників захворів. Що ви зробите?",
    options: [
      { id: "a", text: "Перерозподілю завдання між іншими членами команди" },
      { id: "b", text: "Попрошу продовжити дедлайн" },
      { id: "c", text: "Спробую зв'язатися з хворим колегою" },
      { id: "d", text: "Візьму всі його завдання на себе" },
    ],
    correctAnswer: "a",
    explanation: "Ефективний керівник швидко адаптується, перерозподіляючи завдання з урахуванням компетенцій команди.",
    skill: "Лідерство",
  },
  {
    id: 2,
    text: "Під час наради два колеги вступили в гострий конфлікт. Яка ваша дія?",
    options: [
      { id: "a", text: "Ігнорую і продовжую нараду" },
      { id: "b", text: "Призупиню нараду і запропоную обговорити конфлікт приватно" },
      { id: "c", text: "Стану на бік одного з колег" },
      { id: "d", text: "Попрошу обох залишити нараду" },
    ],
    correctAnswer: "b",
    explanation: "Важливо вирішувати конфлікти конструктивно, надаючи можливість для приватного обговорення.",
    skill: "Комунікація",
  },
  {
    id: 3,
    text: "Клієнт вимагає змін у проєкті за день до здачі. Що ви зробите?",
    options: [
      { id: "a", text: "Відмовлю, посилаючись на терміни" },
      { id: "b", text: "Погоджуся на всі зміни" },
      { id: "c", text: "Оціню реальність змін та запропоную компроміс" },
      { id: "d", text: "Передам питання керівництву" },
    ],
    correctAnswer: "c",
    explanation: "Професійний підхід — це оцінка можливостей та пошук взаємовигідного рішення.",
    skill: "Переговори",
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "hard":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "Легкий";
    case "medium":
      return "Середній";
    case "hard":
      return "Складний";
    default:
      return difficulty;
  }
};

const VeteranSimulation = () => {
  const [activeTab, setActiveTab] = useState("simulations");
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);

  const completedSimulations = simulations.filter(s => s.completed).length;
  const averageScore = simulations.filter(s => s.score).reduce((acc, s) => acc + (s.score || 0), 0) / 
    simulations.filter(s => s.score).length || 0;

  const handleStartSimulation = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setCurrentQuestion(0);
    setSelectedAnswer("");
    setShowResult(false);
    setAnswers([]);
    setActiveTab("active");
  };

  const handleNextQuestion = () => {
    setAnswers([...answers, selectedAnswer]);
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer("");
    } else {
      setShowResult(true);
    }
  };

  const handleRestartSimulation = () => {
    setSelectedSimulation(null);
    setCurrentQuestion(0);
    setSelectedAnswer("");
    setShowResult(false);
    setAnswers([]);
    setActiveTab("simulations");
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === sampleQuestions[index].correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / sampleQuestions.length) * 100);
  };

  return (
    <AppLayout role="veteran">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/veteran" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Симуляції для оцінки навичок
            </h1>
            <p className="text-muted-foreground mt-1">
              Практичні сценарії для перевірки ваших цивільних навичок
            </p>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{completedSimulations}/{simulations.length}</p>
                  <p className="text-xs text-muted-foreground">Пройдено симуляцій</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{averageScore.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Середній бал</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">12</p>
                  <p className="text-xs text-muted-foreground">Оцінених навичок</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">1.5 год</p>
                  <p className="text-xs text-muted-foreground">Загальний час</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="simulations">Доступні симуляції</TabsTrigger>
            <TabsTrigger value="results">Мої результати</TabsTrigger>
            {selectedSimulation && <TabsTrigger value="active">Активна симуляція</TabsTrigger>}
          </TabsList>

          <TabsContent value="simulations">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {simulations.map((simulation) => (
                  <Card key={simulation.id} className={simulation.completed ? "border-green-500/30" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            simulation.category === "Лідерство" ? "bg-primary/10" :
                            simulation.category === "Безпека" ? "bg-red-500/10" :
                            simulation.category === "Менеджмент" ? "bg-blue-500/10" :
                            simulation.category === "Комунікація" ? "bg-purple-500/10" :
                            "bg-green-500/10"
                          }`}>
                            {simulation.category === "Лідерство" && <Users className="h-5 w-5 text-primary" />}
                            {simulation.category === "Безпека" && <Target className="h-5 w-5 text-red-600" />}
                            {simulation.category === "Менеджмент" && <Briefcase className="h-5 w-5 text-blue-600" />}
                            {simulation.category === "Комунікація" && <MessageSquare className="h-5 w-5 text-purple-600" />}
                            {simulation.category === "Технічні" && <Brain className="h-5 w-5 text-green-600" />}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{simulation.title}</h3>
                            <p className="text-sm text-muted-foreground">{simulation.category}</p>
                          </div>
                        </div>
                        {simulation.completed && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">{simulation.score}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{simulation.description}</p>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Badge variant="outline" className={getDifficultyColor(simulation.difficulty)}>
                          {getDifficultyLabel(simulation.difficulty)}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {simulation.duration}
                        </Badge>
                        {simulation.skillsTested.slice(0, 2).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {simulation.skillsTested.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{simulation.skillsTested.length - 2}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleStartSimulation(simulation)}
                        variant={simulation.completed ? "outline" : "default"}
                        className="w-full"
                      >
                        {simulation.completed ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Пройти знову
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Розпочати
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <AIInsightCard
                  title="Рекомендації"
                  insight="Рекомендуємо розпочати з симуляції 'Планування проєкту' — вона добре розкриє ваші організаторські здібності та допоможе оцінити готовність до цивільних проєктів."
                  factors={[
                    { label: "Лідерські навички", value: "Високі", weight: 95 },
                    { label: "Кризовий менеджмент", value: "Відмінно", weight: 98 },
                    { label: "Планування", value: "Потребує оцінки", weight: 0 },
                  ]}
                  methodology="На основі результатів попередніх симуляцій"
                />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Категорії симуляцій</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {["Лідерство", "Безпека", "Менеджмент", "Комунікація", "Технічні"].map((category) => {
                      const count = simulations.filter(s => s.category === category).length;
                      const completed = simulations.filter(s => s.category === category && s.completed).length;
                      return (
                        <div key={category} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                          <span className="text-sm text-foreground">{category}</span>
                          <span className="text-xs text-muted-foreground">{completed}/{count}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Пройдені симуляції</CardTitle>
                  <CardDescription>Ваші результати за категоріями</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {simulations.filter(s => s.completed).map((simulation) => (
                    <div key={simulation.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{simulation.title}</h4>
                        <Badge variant="outline" className="text-green-600 border-green-500/30">
                          {simulation.score}%
                        </Badge>
                      </div>
                      <Progress value={simulation.score} className="h-2 mb-2" />
                      <div className="flex items-center gap-2 flex-wrap">
                        {simulation.skillsTested.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Оцінка навичок</CardTitle>
                  <CardDescription>Загальний профіль за результатами симуляцій</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Лідерство", score: 92 },
                    { name: "Кризовий менеджмент", score: 98 },
                    { name: "Комунікація", score: 88 },
                    { name: "Прийняття рішень", score: 95 },
                    { name: "Стресостійкість", score: 96 },
                    { name: "Швидке мислення", score: 94 },
                  ].map((skill) => (
                    <div key={skill.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{skill.name}</span>
                        <span className="text-sm font-medium text-primary">{skill.score}%</span>
                      </div>
                      <Progress value={skill.score} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active">
            {selectedSimulation && !showResult && (
              <div className="max-w-3xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedSimulation.title}</CardTitle>
                        <CardDescription>Питання {currentQuestion + 1} з {sampleQuestions.length}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {sampleQuestions[currentQuestion].skill}
                      </Badge>
                    </div>
                    <Progress value={(currentQuestion + 1) / sampleQuestions.length * 100} className="h-2 mt-4" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-accent/30">
                      <p className="text-foreground font-medium">
                        {sampleQuestions[currentQuestion].text}
                      </p>
                    </div>

                    <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                      {sampleQuestions[currentQuestion].options.map((option) => (
                        <div 
                          key={option.id}
                          className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedAnswer(option.id)}
                        >
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <div className="flex items-center justify-between pt-4">
                      <Button variant="outline" onClick={handleRestartSimulation}>
                        Скасувати
                      </Button>
                      <Button 
                        onClick={handleNextQuestion}
                        disabled={!selectedAnswer}
                      >
                        {currentQuestion < sampleQuestions.length - 1 ? (
                          <>
                            Далі
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </>
                        ) : (
                          "Завершити"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {showResult && (
              <div className="max-w-3xl mx-auto">
                <Card>
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Симуляцію завершено!</CardTitle>
                    <CardDescription>
                      {selectedSimulation?.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-primary mb-2">{calculateScore()}%</p>
                      <p className="text-muted-foreground">Ваш результат</p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground">Аналіз відповідей:</h4>
                      {sampleQuestions.map((question, index) => (
                        <div 
                          key={question.id}
                          className={`p-4 rounded-lg border ${
                            answers[index] === question.correctAnswer 
                              ? "border-green-500/30 bg-green-500/5" 
                              : "border-red-500/30 bg-red-500/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {answers[index] === question.correctAnswer ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-red-500 mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground mb-1">
                                {question.text}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {question.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <Button variant="outline" onClick={handleRestartSimulation} className="flex-1">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        До списку симуляцій
                      </Button>
                      <Button asChild className="flex-1">
                        <Link to="/veteran/skills">
                          Переглянути навички
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default VeteranSimulation;
