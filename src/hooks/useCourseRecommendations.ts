import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Course {
  title: string;
  platform: string;
  duration: string;
  type: string;
  url?: string;
  rating?: number;
  students?: string;
}

export interface CourseLevel {
  level: string;
  courses: Course[];
  isLoading: boolean;
}

export function useCourseRecommendations() {
  const [courseLevels, setCourseLevels] = useState<Record<string, CourseLevel>>({});
  const { toast } = useToast();

  const fetchCoursesForLevel = useCallback(async (
    role: string,
    level: string,
    area: string
  ) => {
    const key = `${role}-${level}`;
    
    // Set loading state
    setCourseLevels(prev => ({
      ...prev,
      [key]: { level, courses: [], isLoading: true }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('recommend-courses', {
        body: { role, level, area }
      });

      if (error) {
        throw error;
      }

      const courses = data?.courses || [];
      
      setCourseLevels(prev => ({
        ...prev,
        [key]: { level, courses, isLoading: false }
      }));

      return courses;
    } catch (error) {
      console.error("Error fetching courses:", error);
      
      // Fallback to static courses on error
      const fallbackCourses = getFallbackCourses(level);
      
      setCourseLevels(prev => ({
        ...prev,
        [key]: { level, courses: fallbackCourses, isLoading: false }
      }));

      toast({
        title: "Використано статичні рекомендації",
        description: "AI-рекомендації недоступні, показано базові курси",
        variant: "default",
      });

      return fallbackCourses;
    }
  }, [toast]);

  return { courseLevels, fetchCoursesForLevel };
}

function getFallbackCourses(level: string): Course[] {
  const fallbackByLevel: Record<string, Course[]> = {
    "Junior": [
      { title: "Основи професії", duration: "4 тижні", type: "Базовий", platform: "Coursera" },
      { title: "Практичні інструменти", duration: "3 тижні", type: "Практика", platform: "Udemy" },
      { title: "Soft skills для початківців", duration: "2 тижні", type: "Soft skills", platform: "LinkedIn Learning" },
    ],
    "Middle": [
      { title: "Поглиблені технології", duration: "6 тижнів", type: "Просунутий", platform: "Pluralsight" },
      { title: "Проектний менеджмент", duration: "4 тижні", type: "Менеджмент", platform: "Coursera" },
      { title: "Комунікація в команді", duration: "3 тижні", type: "Soft skills", platform: "Skillshare" },
    ],
    "Senior": [
      { title: "Архітектура та системний дизайн", duration: "8 тижнів", type: "Експертний", platform: "O'Reilly" },
      { title: "Технічне лідерство", duration: "5 тижнів", type: "Лідерство", platform: "LinkedIn Learning" },
      { title: "Менторинг та наставництво", duration: "4 тижні", type: "Soft skills", platform: "Udemy" },
    ],
    "Lead": [
      { title: "Стратегічне управління", duration: "6 тижнів", type: "Стратегія", platform: "Harvard Online" },
      { title: "Управління командами", duration: "5 тижнів", type: "Менеджмент", platform: "Coursera" },
      { title: "Бізнес-аналітика для лідерів", duration: "4 тижні", type: "Бізнес", platform: "MIT OpenCourseWare" },
    ],
  };

  return fallbackByLevel[level] || fallbackByLevel["Junior"];
}
