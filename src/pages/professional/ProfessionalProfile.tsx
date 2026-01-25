import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  Calendar,
  Link as LinkIcon,
  Github,
  Linkedin,
  Globe,
  Camera,
  Save,
  Edit2,
  CheckCircle2,
  Star,
  Award,
  Target,
  TrendingUp,
  FileText,
  Plus,
  X
} from "lucide-react";
import { useState } from "react";
import profileAvatar from "@/assets/profile-avatar.png";

interface SocialLink {
  id: string;
  type: "linkedin" | "github" | "portfolio" | "other";
  url: string;
  label?: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  experience: string;
  availableFrom: string;
  expectedSalary: string;
  socialLinks: SocialLink[];
}

const initialProfile: ProfileData = {
  firstName: "Максим",
  lastName: "Коваленко",
  title: "Senior Frontend Developer",
  email: "maksym.kovalenko@email.com",
  phone: "+380 67 123 4567",
  location: "Київ, Україна",
  bio: "Досвідчений Frontend розробник з 5+ роками досвіду у створенні масштабованих веб-додатків. Спеціалізуюсь на React, TypeScript та сучасних підходах до архітектури.",
  experience: "5+ років",
  availableFrom: "Одразу",
  expectedSalary: "$4,000 - $5,500",
  socialLinks: [
    { id: "1", type: "linkedin", url: "https://linkedin.com/in/maksym-kovalenko" },
    { id: "2", type: "github", url: "https://github.com/mkovalenko" },
    { id: "3", type: "portfolio", url: "https://maksym.dev" },
  ]
};

const competencies = [
  { name: "React/TypeScript", level: 92 },
  { name: "Архітектура", level: 85 },
  { name: "Тестування", level: 68 },
  { name: "Системний дизайн", level: 62 },
  { name: "Node.js", level: 75 },
  { name: "DevOps", level: 55 },
];

const achievements = [
  { icon: Target, label: "Кейсів виконано", value: "5" },
  { icon: Star, label: "Середній бал", value: "84" },
  { icon: Award, label: "Сертифікатів", value: "2" },
  { icon: TrendingUp, label: "Рейтинг", value: "Топ 15%" },
];

const getSocialIcon = (type: SocialLink["type"]) => {
  switch (type) {
    case "linkedin": return Linkedin;
    case "github": return Github;
    case "portfolio": return Globe;
    default: return LinkIcon;
  }
};

const getSocialLabel = (type: SocialLink["type"]) => {
  switch (type) {
    case "linkedin": return "LinkedIn";
    case "github": return "GitHub";
    case "portfolio": return "Портфоліо";
    default: return "Посилання";
  }
};

const ProfessionalProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [editedProfile, setEditedProfile] = useState<ProfileData>(initialProfile);
  const [newLinkType, setNewLinkType] = useState<SocialLink["type"]>("other");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    const newLink: SocialLink = {
      id: Date.now().toString(),
      type: newLinkType,
      url: newLinkUrl,
    };
    setEditedProfile({
      ...editedProfile,
      socialLinks: [...editedProfile.socialLinks, newLink]
    });
    setNewLinkUrl("");
    setNewLinkType("other");
  };

  const handleRemoveLink = (id: string) => {
    setEditedProfile({
      ...editedProfile,
      socialLinks: editedProfile.socialLinks.filter(l => l.id !== id)
    });
  };

  const profileCompleteness = 68; // This would be calculated based on filled fields

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Мій профіль</h1>
            <p className="text-muted-foreground mt-1">Керуйте вашою професійною інформацією</p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Скасувати
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Зберегти
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Редагувати профіль
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img 
                        src={profileAvatar} 
                        alt="Фото профілю" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                      />
                      {isEditing && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!isEditing && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Верифіковано
                      </Badge>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="flex-1 space-y-4">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Ім'я</Label>
                            <Input 
                              value={editedProfile.firstName}
                              onChange={(e) => setEditedProfile({...editedProfile, firstName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Прізвище</Label>
                            <Input 
                              value={editedProfile.lastName}
                              onChange={(e) => setEditedProfile({...editedProfile, lastName: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Посада / Спеціалізація</Label>
                          <Input 
                            value={editedProfile.title}
                            onChange={(e) => setEditedProfile({...editedProfile, title: e.target.value})}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h2 className="text-2xl font-semibold text-foreground">
                            {profile.firstName} {profile.lastName}
                          </h2>
                          <p className="text-lg text-muted-foreground">{profile.title}</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {profile.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {profile.experience}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Доступний: {profile.availableFrom}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Контактна інформація
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={editedProfile.email}
                          onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Телефон</Label>
                        <Input 
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Місто / Локація</Label>
                      <Input 
                        value={editedProfile.location}
                        onChange={(e) => setEditedProfile({...editedProfile, location: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Телефон</p>
                        <p className="text-sm font-medium">{profile.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Про мене
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Біографія</Label>
                      <Textarea 
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                        rows={4}
                        placeholder="Розкажіть про себе, свій досвід та навички..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Досвід роботи</Label>
                        <Input 
                          value={editedProfile.experience}
                          onChange={(e) => setEditedProfile({...editedProfile, experience: e.target.value})}
                          placeholder="напр. 5+ років"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Очікувана зарплата</Label>
                        <Input 
                          value={editedProfile.expectedSalary}
                          onChange={(e) => setEditedProfile({...editedProfile, expectedSalary: e.target.value})}
                          placeholder="напр. $4,000 - $5,000"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Посилання та ресурси
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-3">
                      {editedProfile.socialLinks.map((link) => {
                        const IconComponent = getSocialIcon(link.type);
                        return (
                          <div key={link.id} className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/50">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input 
                              value={link.url}
                              onChange={(e) => {
                                setEditedProfile({
                                  ...editedProfile,
                                  socialLinks: editedProfile.socialLinks.map(l => 
                                    l.id === link.id ? {...l, url: e.target.value} : l
                                  )
                                });
                              }}
                              className="flex-1"
                            />
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveLink(link.id)}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center gap-3">
                      <select 
                        value={newLinkType}
                        onChange={(e) => setNewLinkType(e.target.value as SocialLink["type"])}
                        className="px-3 py-2 rounded-md border bg-background text-sm"
                      >
                        <option value="linkedin">LinkedIn</option>
                        <option value="github">GitHub</option>
                        <option value="portfolio">Портфоліо</option>
                        <option value="other">Інше</option>
                      </select>
                      <Input 
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={handleAddLink}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.socialLinks.map((link) => {
                      const IconComponent = getSocialIcon(link.type);
                      return (
                        <a 
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-background">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{getSocialLabel(link.type)}</p>
                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Резюме
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-3">Резюме не завантажено</p>
                  <Button variant="outline">
                    Завантажити резюме
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Stats & Completeness */}
          <div className="space-y-6">
            {/* Profile Completeness */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Повнота профілю</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Заповнено</span>
                  <span className="text-2xl font-semibold text-primary">{profileCompleteness}%</span>
                </div>
                <Progress value={profileCompleteness} className="h-3" />
                
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-muted-foreground">Базова інформація</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-muted-foreground">Контактні дані</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-muted-foreground">Соціальні посилання</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-600" />
                    <span>Завантажте резюме</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-600" />
                    <span>Пройдіть оцінювання</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Досягнення
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement, index) => {
                  const IconComponent = achievement.icon;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">{achievement.label}</span>
                      </div>
                      <span className="font-semibold">{achievement.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Competencies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Компетенції
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {competencies.map((comp) => (
                  <div key={comp.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{comp.name}</span>
                      <span className="font-medium">{comp.level}%</span>
                    </div>
                    <Progress value={comp.level} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalProfile;
