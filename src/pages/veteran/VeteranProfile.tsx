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
  Shield,
  Calendar,
  Link as LinkIcon,
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
  Briefcase,
  Plus,
  X,
  Medal,
  Swords,
  Heart
} from "lucide-react";
import { useState } from "react";
import veteranAvatar from "@/assets/veteran-avatar.png";

interface SocialLink {
  id: string;
  type: "linkedin" | "portfolio" | "other";
  url: string;
  label?: string;
}

interface ProfessionalExperience {
  id: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface CivilianSkill {
  id: string;
  skillName: string;
  description: string;
  proficiencyLevel: number;
}

interface VeteranProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  serviceYears: string;
  availableFrom: string;
  preferredIndustries: string[];
  professionalExperience: ProfessionalExperience[];
  civilianSkills: CivilianSkill[];
  civilianEducation: string;
  certifications: string[];
  socialLinks: SocialLink[];
}

const initialProfile: VeteranProfileData = {
  firstName: "Андрій",
  lastName: "Шевченко",
  email: "andrii.shevchenko@email.com",
  phone: "+380 67 890 1234",
  location: "Дніпро, Україна",
  bio: "Ветеран ЗСУ з досвідом управління та організації процесів. Шукаю можливості застосувати набуті навички у сфері менеджменту або безпеки. Готовий до навчання та розвитку у цивільних професіях.",
  serviceYears: "8 років",
  availableFrom: "Одразу",
  preferredIndustries: ["Менеджмент", "Безпека", "IT", "Логістика"],
  professionalExperience: [
    {
      id: "1",
      position: "Керівник команди",
      startDate: "2020",
      endDate: "2024",
      description: "Управління командою з 120+ осіб, планування та координація проєктів, забезпечення логістичних процесів"
    },
    {
      id: "2",
      position: "Інструктор з підготовки персоналу",
      startDate: "2018",
      endDate: "2020",
      description: "Навчання та розвиток персоналу, розробка навчальних програм, проведення тренінгів"
    }
  ],
  civilianSkills: [
    { id: "1", skillName: "Управління командою", description: "People Management, лідерство", proficiencyLevel: 95 },
    { id: "2", skillName: "Проєктний менеджмент", description: "Планування та координація проєктів", proficiencyLevel: 90 },
    { id: "3", skillName: "Антикризовий менеджмент", description: "Прийняття рішень у складних ситуаціях", proficiencyLevel: 98 },
    { id: "4", skillName: "Операційний менеджмент", description: "Supply Chain, логістика", proficiencyLevel: 85 },
    { id: "5", skillName: "Технічне управління", description: "IT-інфраструктура, технічні системи", proficiencyLevel: 70 },
  ],
  civilianEducation: "Вища освіта, магістр управління",
  certifications: ["Перша медична допомога", "Управління проєктами (базовий курс)"],
  socialLinks: [
    { id: "1", type: "linkedin", url: "https://linkedin.com/in/andrii-shevchenko" },
  ]
};

const achievements = [
  { icon: Medal, label: "Років служби", value: "8" },
  { icon: Target, label: "Навичок", value: "12" },
  { icon: Star, label: "Матч професій", value: "92%" },
  { icon: Award, label: "Сертифікатів", value: "2" },
];

const getSocialIcon = (type: SocialLink["type"]) => {
  switch (type) {
    case "linkedin": return Linkedin;
    case "portfolio": return Globe;
    default: return LinkIcon;
  }
};

const getSocialLabel = (type: SocialLink["type"]) => {
  switch (type) {
    case "linkedin": return "LinkedIn";
    case "portfolio": return "Портфоліо";
    default: return "Посилання";
  }
};

const VeteranProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<VeteranProfileData>(initialProfile);
  const [editedProfile, setEditedProfile] = useState<VeteranProfileData>(initialProfile);
  const [newLinkType, setNewLinkType] = useState<SocialLink["type"]>("other");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newCertification, setNewCertification] = useState("");

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

  const handleAddIndustry = () => {
    if (!newIndustry.trim()) return;
    setEditedProfile({
      ...editedProfile,
      preferredIndustries: [...editedProfile.preferredIndustries, newIndustry.trim()]
    });
    setNewIndustry("");
  };

  const handleRemoveIndustry = (industry: string) => {
    setEditedProfile({
      ...editedProfile,
      preferredIndustries: editedProfile.preferredIndustries.filter(i => i !== industry)
    });
  };

  const handleAddCertification = () => {
    if (!newCertification.trim()) return;
    setEditedProfile({
      ...editedProfile,
      certifications: [...editedProfile.certifications, newCertification.trim()]
    });
    setNewCertification("");
  };

  const handleRemoveCertification = (cert: string) => {
    setEditedProfile({
      ...editedProfile,
      certifications: editedProfile.certifications.filter(c => c !== cert)
    });
  };

  const profileCompleteness = 78;

  return (
    <AppLayout role="veteran">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Мій профіль</h1>
            <p className="text-muted-foreground mt-1">Керуйте вашою інформацією для переходу на цивільні професії</p>
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
                        src={veteranAvatar} 
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
                        <Shield className="h-3 w-3 mr-1" />
                        Ветеран ЗСУ
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
                          <p className="text-lg text-muted-foreground">Ветеран ЗСУ</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {profile.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Medal className="h-4 w-4" />
                            {profile.serviceYears} досвіду
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

            {/* Professional Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Професійний досвід
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Загальний стаж</Label>
                        <Input 
                          value={editedProfile.serviceYears}
                          onChange={(e) => setEditedProfile({...editedProfile, serviceYears: e.target.value})}
                          placeholder="напр. 8 років"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Доступний з</Label>
                        <Input 
                          value={editedProfile.availableFrom}
                          onChange={(e) => setEditedProfile({...editedProfile, availableFrom: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">Загальний стаж</p>
                        <p className="text-sm font-medium text-foreground">{profile.serviceYears}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/30 text-center">
                        <p className="text-xs text-muted-foreground">Доступність</p>
                        <p className="text-sm font-medium text-foreground">{profile.availableFrom}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      {profile.professionalExperience.map((exp) => (
                        <div key={exp.id} className="p-4 rounded-lg bg-accent/50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-foreground">{exp.position}</p>
                            </div>
                            <Badge variant="secondary">{exp.startDate} - {exp.endDate}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Civilian Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Цивільні навички
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.civilianSkills.map((skill) => (
                    <div key={skill.id} className="p-4 rounded-lg bg-accent/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{skill.skillName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-primary">{skill.proficiencyLevel}%</span>
                        </div>
                      </div>
                      <Progress value={skill.proficiencyLevel} className="h-2" />
                    </div>
                  ))}
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

            {/* Bio & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Про мене та цілі
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
                        placeholder="Розкажіть про себе, свій досвід та цілі..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Цивільна освіта</Label>
                      <Input 
                        value={editedProfile.civilianEducation}
                        onChange={(e) => setEditedProfile({...editedProfile, civilianEducation: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Бажані сфери роботи</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editedProfile.preferredIndustries.map((industry, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {industry}
                            <button onClick={() => handleRemoveIndustry(industry)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={newIndustry}
                          onChange={(e) => setNewIndustry(e.target.value)}
                          placeholder="Додати сферу..."
                          onKeyDown={(e) => e.key === "Enter" && handleAddIndustry()}
                        />
                        <Button variant="outline" size="sm" onClick={handleAddIndustry}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Сертифікати та курси</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editedProfile.certifications.map((cert, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {cert}
                            <button onClick={() => handleRemoveCertification(cert)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={newCertification}
                          onChange={(e) => setNewCertification(e.target.value)}
                          placeholder="Додати сертифікат..."
                          onKeyDown={(e) => e.key === "Enter" && handleAddCertification()}
                        />
                        <Button variant="outline" size="sm" onClick={handleAddCertification}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">{profile.bio}</p>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Освіта:</p>
                      <p className="text-sm text-muted-foreground">{profile.civilianEducation}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Бажані сфери:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.preferredIndustries.map((industry, index) => (
                          <Badge key={index} variant="secondary">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Сертифікати:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline">
                            <Award className="h-3 w-3 mr-1" />
                            {cert}
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
                    Професійний досвід
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Цивільні навички
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    Пройти оцінку навичок
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

            {/* Support message */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Підтримка ветеранів</p>
                    <p className="text-xs text-muted-foreground">
                      Усі сервіси для ветеранів надаються безкоштовно. Ви можете рухатись у власному темпі.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Швидкі дії
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/veteran/skills">
                    <Target className="h-4 w-4 mr-2" />
                    Оцінка навичок
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/veteran/matching">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Підбір професій
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/veteran/adaptation">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Програма адаптації
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

export default VeteranProfile;
