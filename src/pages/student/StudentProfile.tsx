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
  GraduationCap,
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
  BookOpen,
  Building2,
  Plus,
  X
} from "lucide-react";
import { useState } from "react";
import studentAvatar from "@/assets/student-avatar.png";

interface SocialLink {
  id: string;
  type: "linkedin" | "github" | "portfolio" | "other";
  url: string;
  label?: string;
}

interface StudentProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  institution: string;
  faculty: string;
  specialization: string;
  course: number;
  graduationYear: number;
  gpa: string;
  interests: string[];
  socialLinks: SocialLink[];
}

const initialProfile: StudentProfileData = {
  firstName: "Олександра",
  lastName: "Петренко",
  email: "oleksandra.petrenko@student.edu.ua",
  phone: "+380 98 765 4321",
  location: "Львів, Україна",
  bio: "Студентка 3 курсу, захоплююсь аналітикою даних та машинним навчанням. Шукаю можливості для стажування у сфері IT.",
  institution: "Національний університет «Львівська політехніка»",
  faculty: "Інститут комп'ютерних наук та інформаційних технологій",
  specialization: "Комп'ютерні науки",
  course: 3,
  graduationYear: 2026,
  gpa: "4.5",
  interests: ["Data Science", "Machine Learning", "Web Development", "UX Design"],
  socialLinks: [
    { id: "1", type: "linkedin", url: "https://linkedin.com/in/oleksandra-petrenko" },
    { id: "2", type: "github", url: "https://github.com/opetrenko" },
  ]
};

const achievements = [
  { icon: Target, label: "Тести пройдено", value: "3" },
  { icon: Star, label: "Професійний матч", value: "92%" },
  { icon: Award, label: "Стажувань", value: "1" },
  { icon: TrendingUp, label: "Прогрес", value: "45%" },
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

const StudentProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<StudentProfileData>(initialProfile);
  const [editedProfile, setEditedProfile] = useState<StudentProfileData>(initialProfile);
  const [newLinkType, setNewLinkType] = useState<SocialLink["type"]>("other");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newInterest, setNewInterest] = useState("");

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

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    setEditedProfile({
      ...editedProfile,
      interests: [...editedProfile.interests, newInterest.trim()]
    });
    setNewInterest("");
  };

  const handleRemoveInterest = (interest: string) => {
    setEditedProfile({
      ...editedProfile,
      interests: editedProfile.interests.filter(i => i !== interest)
    });
  };

  const profileCompleteness = 72;

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Мій профіль</h1>
            <p className="text-muted-foreground mt-1">Керуйте вашою студентською інформацією</p>
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
                        src={studentAvatar} 
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
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Студент
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
                      </>
                    ) : (
                      <>
                        <div>
                          <h2 className="text-2xl font-semibold text-foreground">
                            {profile.firstName} {profile.lastName}
                          </h2>
                          <p className="text-lg text-muted-foreground">{profile.specialization}</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {profile.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4" />
                            {profile.course} курс
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Випуск: {profile.graduationYear}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Освіта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Навчальний заклад</Label>
                      <Input 
                        value={editedProfile.institution}
                        onChange={(e) => setEditedProfile({...editedProfile, institution: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Факультет / Інститут</Label>
                      <Input 
                        value={editedProfile.faculty}
                        onChange={(e) => setEditedProfile({...editedProfile, faculty: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Спеціальність / Напрямок</Label>
                        <Input 
                          value={editedProfile.specialization}
                          onChange={(e) => setEditedProfile({...editedProfile, specialization: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Курс</Label>
                        <Input 
                          type="number"
                          min={1}
                          max={6}
                          value={editedProfile.course}
                          onChange={(e) => setEditedProfile({...editedProfile, course: parseInt(e.target.value) || 1})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Рік випуску</Label>
                        <Input 
                          type="number"
                          value={editedProfile.graduationYear}
                          onChange={(e) => setEditedProfile({...editedProfile, graduationYear: parseInt(e.target.value) || 2026})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Середній бал (GPA)</Label>
                        <Input 
                          value={editedProfile.gpa}
                          onChange={(e) => setEditedProfile({...editedProfile, gpa: e.target.value})}
                          placeholder="напр. 4.5"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">{profile.institution}</p>
                          <p className="text-sm text-muted-foreground">{profile.faculty}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">Спеціальність</p>
                        <p className="text-sm font-medium text-foreground">{profile.specialization}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">Курс</p>
                        <p className="text-sm font-medium text-foreground">{profile.course}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">Рік випуску</p>
                        <p className="text-sm font-medium text-foreground">{profile.graduationYear}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">GPA</p>
                        <p className="text-sm font-medium text-foreground">{profile.gpa}</p>
                      </div>
                    </div>
                  </div>
                )}
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

            {/* Bio & Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Про мене
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Коротко про себе</Label>
                      <Textarea 
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                        rows={4}
                        placeholder="Розкажіть про себе, свої інтереси та цілі..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Інтереси та напрямки</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editedProfile.interests.map((interest, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {interest}
                            <button onClick={() => handleRemoveInterest(interest)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Додати інтерес..."
                          onKeyDown={(e) => e.key === "Enter" && handleAddInterest()}
                        />
                        <Button variant="outline" size="sm" onClick={handleAddInterest}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">{profile.bio}</p>
                    <div className="pt-4">
                      <p className="text-sm font-medium text-foreground mb-2">Інтереси:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} variant="secondary">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
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
                          <IconComponent className="h-5 w-5 text-primary" />
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
          </div>

          {/* Right column - Stats and Progress */}
          <div className="space-y-6">
            {/* Profile completeness */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Заповненість профілю
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <Progress value={profileCompleteness} className="flex-1" />
                  <span className="text-lg font-semibold text-primary">{profileCompleteness}%</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Базова інформація
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Освіта
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    Додати портфоліо
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    Пройти профорієнтування
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Досягнення
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((achievement, index) => {
                    const IconComponent = achievement.icon;
                    return (
                      <div key={index} className="p-3 rounded-lg bg-accent/50 text-center">
                        <IconComponent className="h-5 w-5 text-primary mx-auto mb-1" />
                        <p className="text-lg font-semibold text-foreground">{achievement.value}</p>
                        <p className="text-xs text-muted-foreground">{achievement.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Швидкі дії
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/student/orientation">
                    <Target className="h-4 w-4 mr-2" />
                    Профорієнтування
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/student/professions">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Переглянути професії
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/student/internship">
                    <Building2 className="h-4 w-4 mr-2" />
                    Міні-стажування
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentProfile;
