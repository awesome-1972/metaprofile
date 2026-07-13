import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  Plus, 
  UserCircle, 
  Calendar, 
  MessageSquare,
  ClipboardList,
  Settings,
  Sparkles,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Типи офісу й ролі віртуального співробітника — збігаються з опціями Select. */
type OfficeType = "headquarters" | "branch" | "department";
type EmployeeRole = "manager" | "buddy" | "colleague";

interface VirtualEmployee {
  id: string;
  name: string;
  position: string;
  role: EmployeeRole;
  avatar: string;
  personality: string;
}

interface VirtualOffice {
  id: string;
  name: string;
  type: "headquarters" | "branch" | "department";
  employees: VirtualEmployee[];
  culture: string[];
  processes: string[];
}

const CompanyInternRequests = () => {
  const [offices, setOffices] = useState<VirtualOffice[]>([
    {
      id: "1",
      name: "Відділ розробки",
      type: "department",
      employees: [
        {
          id: "e1",
          name: "Олексій Савченко",
          position: "Tech Lead",
          role: "manager",
          avatar: "👨‍💻",
          personality: "Досвідчений, терплячий, любить ділитися знаннями"
        },
        {
          id: "e2",
          name: "Марина Коваль",
          position: "Senior Developer",
          role: "buddy",
          avatar: "👩‍💻",
          personality: "Дружелюбна, енергійна, завжди готова допомогти"
        }
      ],
      culture: ["Код-рев'ю обов'язкове", "Документація важлива", "Питання вітаються"],
      processes: ["Agile/Scrum", "CI/CD", "Щотижневі ретроспективи"]
    }
  ]);

  const [isCreatingOffice, setIsCreatingOffice] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const [newOffice, setNewOffice] = useState<{
    name: string;
    type: OfficeType;
    cultureValues: string;
    processes: string;
  }>({
    name: "",
    type: "department",
    cultureValues: "",
    processes: ""
  });

  const [newEmployee, setNewEmployee] = useState<{
    name: string;
    position: string;
    role: EmployeeRole;
    personality: string;
  }>({
    name: "",
    position: "",
    role: "colleague",
    personality: ""
  });

  const handleCreateOffice = () => {
    const office: VirtualOffice = {
      id: Date.now().toString(),
      name: newOffice.name,
      type: newOffice.type,
      employees: [],
      culture: newOffice.cultureValues.split(",").map(v => v.trim()).filter(Boolean),
      processes: newOffice.processes.split(",").map(p => p.trim()).filter(Boolean)
    };
    setOffices([...offices, office]);
    setIsCreatingOffice(false);
    setNewOffice({ name: "", type: "department", cultureValues: "", processes: "" });
  };

  const handleAddEmployee = () => {
    if (!selectedOffice) return;
    
    const avatars = ["👨‍💼", "👩‍💼", "👨‍💻", "👩‍💻", "🧑‍💼", "🧑‍💻"];
    const employee: VirtualEmployee = {
      id: Date.now().toString(),
      name: newEmployee.name,
      position: newEmployee.position,
      role: newEmployee.role,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      personality: newEmployee.personality
    };

    setOffices(offices.map(office => 
      office.id === selectedOffice 
        ? { ...office, employees: [...office.employees, employee] }
        : office
    ));
    setIsAddingEmployee(false);
    setNewEmployee({ name: "", position: "", role: "colleague", personality: "" });
  };

  const internshipRequests = [
    {
      id: "1",
      studentName: "Олександра Петренко",
      position: "Frontend Developer",
      status: "pending",
      appliedAt: "2 години тому",
      duration: "4 години"
    },
    {
      id: "2",
      studentName: "Іван Мельник",
      position: "Data Analyst",
      status: "in_progress",
      appliedAt: "Вчора",
      duration: "6 годин",
      progress: 65
    },
    {
      id: "3",
      studentName: "Марія Коваленко",
      position: "UX Designer",
      status: "completed",
      appliedAt: "3 дні тому",
      duration: "5 годин",
      score: 87
    }
  ];

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Запроси стажерів</h1>
            <p className="text-muted-foreground mt-1">
              Створюйте віртуальні офіси та керуйте стажуваннями
            </p>
          </div>
          <Dialog open={isCreatingOffice} onOpenChange={setIsCreatingOffice}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Створити віртуальний офіс
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Створення віртуального офісу</DialogTitle>
                <DialogDescription>
                  Налаштуйте структуру, культуру та процеси вашого віртуального підрозділу
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Назва підрозділу</Label>
                  <Input 
                    placeholder="Напр.: Відділ розробки, Маркетинговий департамент"
                    value={newOffice.name}
                    onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select 
                    value={newOffice.type} 
                    onValueChange={(v) => setNewOffice({ ...newOffice, type: v as OfficeType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">Головний офіс</SelectItem>
                      <SelectItem value="branch">Філія</SelectItem>
                      <SelectItem value="department">Відділ/Департамент</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Цінності корпоративної культури (через кому)</Label>
                  <Textarea 
                    placeholder="Напр.: Відкритість, Інновації, Командна робота"
                    value={newOffice.cultureValues}
                    onChange={(e) => setNewOffice({ ...newOffice, cultureValues: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Робочі процеси (через кому)</Label>
                  <Textarea 
                    placeholder="Напр.: Agile, Щоденні стендапи, Код-рев'ю"
                    value={newOffice.processes}
                    onChange={(e) => setNewOffice({ ...newOffice, processes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsCreatingOffice(false)}>
                    Скасувати
                  </Button>
                  <Button onClick={handleCreateOffice} disabled={!newOffice.name}>
                    Створити офіс
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="offices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="offices" className="gap-2">
              <Building2 className="h-4 w-4" />
              Віртуальні офіси
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Users className="h-4 w-4" />
              Заявки на стажування
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Розклад
            </TabsTrigger>
          </TabsList>

          {/* Virtual Offices Tab */}
          <TabsContent value="offices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {offices.map((office) => (
                <Card key={office.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{office.name}</CardTitle>
                          <CardDescription>
                            {office.type === "headquarters" && "Головний офіс"}
                            {office.type === "branch" && "Філія"}
                            {office.type === "department" && "Відділ"}
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Employees */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Команда</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedOffice(office.id);
                            setIsAddingEmployee(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Додати
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {office.employees.map((emp) => (
                          <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                            <span className="text-xl">{emp.avatar}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.position}</p>
                            </div>
                            <Badge variant={
                              emp.role === "manager" ? "default" :
                              emp.role === "buddy" ? "secondary" : "outline"
                            }>
                              {emp.role === "manager" && "Керівник"}
                              {emp.role === "buddy" && "Наставник"}
                              {emp.role === "colleague" && "Колега"}
                            </Badge>
                          </div>
                        ))}
                        {office.employees.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Додайте членів команди
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Culture */}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Культура</span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {office.culture.map((value, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Processes */}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Процеси</span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {office.processes.map((process, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {process}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty state / Create card */}
              <Card className="border-dashed flex items-center justify-center min-h-[300px] cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setIsCreatingOffice(true)}>
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Створити новий офіс</h3>
                  <p className="text-sm text-muted-foreground">
                    Налаштуйте віртуальне середовище для стажерів
                  </p>
                </div>
              </Card>
            </div>

            {/* Tips Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Як створити ефективне стажування</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Додайте <strong>керівника</strong> — він ставитиме завдання та оцінюватиме результати</li>
                    <li>• Призначте <strong>наставника-buddy</strong> — він допомагатиме та відповідатиме на питання</li>
                    <li>• Опишіть <strong>культуру та процеси</strong> — стажер зрозуміє як все працює</li>
                    <li>• Створіть <strong>реалістичні завдання</strong> — це покаже справжню роботу</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="grid gap-4">
              {internshipRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{request.studentName}</h4>
                        <Badge variant={
                          request.status === "pending" ? "outline" :
                          request.status === "in_progress" ? "secondary" : "default"
                        }>
                          {request.status === "pending" && "Очікує"}
                          {request.status === "in_progress" && "В процесі"}
                          {request.status === "completed" && "Завершено"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.position} • {request.duration}
                      </p>
                      {request.status === "in_progress" && request.progress && (
                        <div className="mt-2">
                          <Progress value={request.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Прогрес: {request.progress}%</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{request.appliedAt}</p>
                      {request.status === "completed" && request.score && (
                        <p className="text-lg font-semibold text-primary mt-1">{request.score}%</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button size="sm">Прийняти</Button>
                          <Button size="sm" variant="outline">Відхилити</Button>
                        </>
                      )}
                      {request.status === "in_progress" && (
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Зв'язатися
                        </Button>
                      )}
                      {request.status === "completed" && (
                        <Button size="sm" variant="outline">
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Звіт
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Графік стажувань на тиждень</CardTitle>
                <CardDescription>Заплановані стажування та зустрічі</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { day: "Понеділок", events: [
                      { time: "10:00-12:00", title: "Стажування: Frontend Developer", student: "Олександра П." },
                      { time: "14:00-15:00", title: "Зворотній зв'язок", student: "Марія К." }
                    ]},
                    { day: "Вівторок", events: [
                      { time: "09:00-15:00", title: "Стажування: Data Analyst", student: "Іван М." }
                    ]},
                    { day: "Середа", events: [] },
                    { day: "Четвер", events: [
                      { time: "11:00-17:00", title: "Стажування: UX Designer", student: "Новий стажер" }
                    ]},
                    { day: "П'ятниця", events: [
                      { time: "10:00-12:00", title: "Командна зустріч зі стажерами", student: "Всі" }
                    ]}
                  ].map((day) => (
                    <div key={day.day} className="flex gap-4">
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-medium">{day.day}</p>
                      </div>
                      <div className="flex-1">
                        {day.events.length > 0 ? (
                          <div className="space-y-2">
                            {day.events.map((event, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground w-24">{event.time}</span>
                                <span className="text-sm font-medium flex-1">{event.title}</span>
                                <Badge variant="outline">{event.student}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">Немає подій</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">Стажувань цього місяця</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-muted-foreground">Успішно завершено</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">Очікують на розгляд</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Employee Dialog */}
        <Dialog open={isAddingEmployee} onOpenChange={setIsAddingEmployee}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Додати члена команди</DialogTitle>
              <DialogDescription>
                Створіть віртуального співробітника для взаємодії зі стажерами
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Ім'я та прізвище</Label>
                <Input 
                  placeholder="Напр.: Олександр Петренко"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Посада</Label>
                <Input 
                  placeholder="Напр.: Senior Developer"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Роль у стажуванні</Label>
                <Select 
                  value={newEmployee.role} 
                  onValueChange={(v) => setNewEmployee({ ...newEmployee, role: v as EmployeeRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Керівник (ставить завдання, оцінює)</SelectItem>
                    <SelectItem value="buddy">Наставник-Buddy (допомагає, відповідає на питання)</SelectItem>
                    <SelectItem value="colleague">Колега (взаємодіє у процесі)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Особистість та стиль спілкування</Label>
                <Textarea 
                  placeholder="Опишіть характер та як ця людина спілкується зі стажерами"
                  value={newEmployee.personality}
                  onChange={(e) => setNewEmployee({ ...newEmployee, personality: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsAddingEmployee(false)}>
                  Скасувати
                </Button>
                <Button onClick={handleAddEmployee} disabled={!newEmployee.name || !newEmployee.position}>
                  Додати
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CompanyInternRequests;
