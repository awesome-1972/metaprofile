import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { ArrowLeft, BarChart3, TrendingUp, Users, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const candidates = [
  {
    id: 1,
    name: "Марія Шевченко",
    position: "Frontend Developer",
    overallScore: 91,
    technicalScore: 95,
    architectureScore: 88,
    communicationScore: 90,
    problemSolvingScore: 89,
    status: "shortlisted",
    completedAt: "22.01.2025",
  },
  {
    id: 2,
    name: "Олена Коваленко",
    position: "Frontend Developer",
    overallScore: 87,
    technicalScore: 92,
    architectureScore: 85,
    communicationScore: 78,
    problemSolvingScore: 84,
    status: "new",
    completedAt: "23.01.2025",
  },
  {
    id: 3,
    name: "Андрій Мельник",
    position: "Frontend Developer",
    overallScore: 79,
    technicalScore: 82,
    architectureScore: 75,
    communicationScore: 80,
    problemSolvingScore: 77,
    status: "reviewed",
    completedAt: "22.01.2025",
  },
  {
    id: 4,
    name: "Олександр Петренко",
    position: "Frontend Developer",
    overallScore: 62,
    technicalScore: 65,
    architectureScore: 58,
    communicationScore: 63,
    problemSolvingScore: 60,
    status: "rejected",
    completedAt: "21.01.2025",
  },
  {
    id: 5,
    name: "Ірина Бондаренко",
    position: "Frontend Developer",
    overallScore: 84,
    technicalScore: 88,
    architectureScore: 80,
    communicationScore: 85,
    problemSolvingScore: 82,
    status: "new",
    completedAt: "23.01.2025",
  },
];

const comparisonData = [
  { name: "Марія Ш.", technical: 95, architecture: 88, communication: 90, problemSolving: 89 },
  { name: "Олена К.", technical: 92, architecture: 85, communication: 78, problemSolving: 84 },
  { name: "Андрій М.", technical: 82, architecture: 75, communication: 80, problemSolving: 77 },
  { name: "Олександр П.", technical: 65, architecture: 58, communication: 63, problemSolving: 60 },
  { name: "Ірина Б.", technical: 88, architecture: 80, communication: 85, problemSolving: 82 },
];

const radarData = [
  { competency: "Технічні навички", "Марія Ш.": 95, "Олена К.": 92, "Ірина Б.": 88, benchmark: 80 },
  { competency: "Архітектура", "Марія Ш.": 88, "Олена К.": 85, "Ірина Б.": 80, benchmark: 75 },
  { competency: "Комунікація", "Марія Ш.": 90, "Олена К.": 78, "Ірина Б.": 85, benchmark: 70 },
  { competency: "Вирішення проблем", "Марія Ш.": 89, "Олена К.": 84, "Ірина Б.": 82, benchmark: 75 },
  { competency: "Командна робота", "Марія Ш.": 87, "Олена К.": 80, "Ірина Б.": 83, benchmark: 72 },
];

const distributionData = [
  { range: "90-100", count: 1, label: "Відмінно" },
  { range: "80-89", count: 2, label: "Добре" },
  { range: "70-79", count: 1, label: "Задовільно" },
  { range: "60-69", count: 1, label: "Нижче середнього" },
  { range: "0-59", count: 0, label: "Незадовільно" },
];

const chartConfig: ChartConfig = {
  technical: { label: "Технічні навички", color: "hsl(var(--chart-1))" },
  architecture: { label: "Архітектура", color: "hsl(var(--chart-2))" },
  communication: { label: "Комунікація", color: "hsl(var(--chart-3))" },
  problemSolving: { label: "Вирішення проблем", color: "hsl(var(--chart-4))" },
  count: { label: "Кількість", color: "hsl(var(--chart-1))" },
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "shortlisted":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">У шорт-лісті</Badge>;
    case "new":
      return <Badge variant="outline">Новий</Badge>;
    case "reviewed":
      return <Badge className="bg-muted/50 text-muted-foreground hover:bg-muted/60">Переглянутий</Badge>;
    case "rejected":
      return <Badge variant="destructive">Відхилений</Badge>;
    default:
      return null;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 85) return "text-primary font-semibold";
  if (score >= 70) return "text-foreground";
  return "text-muted-foreground";
};

const CompanyAnalytics = () => {
  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/company" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Порівняльна аналітика</h1>
            <p className="text-muted-foreground mt-1">Детальний аналіз та порівняння кандидатів</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Експорт звіту
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select defaultValue="ecommerce">
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Кейс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ecommerce">E-commerce платформа</SelectItem>
              <SelectItem value="saas">Аналіз ринку SaaS</SelectItem>
              <SelectItem value="ux">UX редизайн</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі статуси</SelectItem>
              <SelectItem value="shortlisted">У шорт-лісті</SelectItem>
              <SelectItem value="new">Нові</SelectItem>
              <SelectItem value="reviewed">Переглянуті</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Всього кандидатів</p>
                  <p className="text-2xl font-semibold text-foreground">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Середній бал</p>
                  <p className="text-2xl font-semibold text-foreground">80.6</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Вище порогу (80%)</p>
                  <p className="text-2xl font-semibold text-foreground">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">У шорт-лісті</p>
                  <p className="text-2xl font-semibold text-foreground">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Comparison Table */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Порівняльна таблиця кандидатів</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Кандидат</TableHead>
                      <TableHead className="text-center">Загальний</TableHead>
                      <TableHead className="text-center">Технічний</TableHead>
                      <TableHead className="text-center">Архітектура</TableHead>
                      <TableHead className="text-center">Комунікація</TableHead>
                      <TableHead className="text-center">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.completedAt}</p>
                          </div>
                        </TableCell>
                        <TableCell className={`text-center ${getScoreColor(candidate.overallScore)}`}>
                          {candidate.overallScore}%
                        </TableCell>
                        <TableCell className={`text-center ${getScoreColor(candidate.technicalScore)}`}>
                          {candidate.technicalScore}%
                        </TableCell>
                        <TableCell className={`text-center ${getScoreColor(candidate.architectureScore)}`}>
                          {candidate.architectureScore}%
                        </TableCell>
                        <TableCell className={`text-center ${getScoreColor(candidate.communicationScore)}`}>
                          {candidate.communicationScore}%
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(candidate.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <div className="space-y-4">
            <AIInsightCard
              title="Рекомендації щодо відбору"
              insight="На основі аналізу результатів, рекомендуємо розглянути Марію Шевченко та Олену Коваленко для фінального етапу. Обидві демонструють високий рівень технічних навичок."
              factors={[
                { label: "Технічна відповідність", value: "92%", weight: 35 },
                { label: "Архітектурне мислення", value: "85%", weight: 30 },
                { label: "Soft skills", value: "84%", weight: 35 },
              ]}
              methodology="Рекомендація базується на зваженому аналізі компетенцій з урахуванням вимог позиції Frontend Developer."
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart - Competency Comparison */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Порівняння за компетенціями</CardTitle>
              <p className="text-sm text-muted-foreground">Оцінки кандидатів за ключовими компетенціями</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="technical" fill="hsl(var(--chart-1))" name="Технічні навички" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="architecture" fill="hsl(var(--chart-2))" name="Архітектура" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Розподіл за результатами</CardTitle>
              <p className="text-sm text-muted-foreground">Кількість кандидатів у кожному діапазоні оцінок</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name, props) => [`${value} кандидатів`, props.payload.label]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Профіль компетенцій топ-кандидатів</CardTitle>
            <p className="text-sm text-muted-foreground">Порівняння з бенчмарком позиції</p>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="competency" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar
                    name="Марія Ш."
                    dataKey="Марія Ш."
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Олена К."
                    dataKey="Олена К."
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Ірина Б."
                    dataKey="Ірина Б."
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Бенчмарк"
                    dataKey="benchmark"
                    stroke="hsl(var(--chart-5))"
                    fill="hsl(var(--chart-5))"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Competency Breakdown */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Детальний аналіз компетенцій</CardTitle>
            <p className="text-sm text-muted-foreground">Розбивка за всіма оцінюваними параметрами</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Кандидат</TableHead>
                    <TableHead className="text-center">React/TS</TableHead>
                    <TableHead className="text-center">Архітектура</TableHead>
                    <TableHead className="text-center">Комунікація</TableHead>
                    <TableHead className="text-center">Проблеми</TableHead>
                    <TableHead className="text-center">Командна робота</TableHead>
                    <TableHead className="text-center">Загальний</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">{candidate.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${candidate.technicalScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10">{candidate.technicalScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${candidate.architectureScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10">{candidate.architectureScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${candidate.communicationScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10">{candidate.communicationScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${candidate.problemSolvingScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10">{candidate.problemSolvingScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.round(candidate.overallScore * 0.95)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10">{Math.round(candidate.overallScore * 0.95)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-lg font-semibold ${getScoreColor(candidate.overallScore)}`}>
                          {candidate.overallScore}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CompanyAnalytics;
