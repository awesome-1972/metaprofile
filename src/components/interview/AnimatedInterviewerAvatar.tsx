import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AnimatedInterviewerAvatarProps {
  photo: string;
  name: string;
  isSpeaking: boolean;
  className?: string;
}

export const AnimatedInterviewerAvatar = ({
  photo,
  name,
  isSpeaking,
  className,
}: AnimatedInterviewerAvatarProps) => {
  return (
    <div className={cn("relative", className)}>
      {/* Main avatar container */}
      <div className="relative w-64 h-64 mx-auto">
        {/* Glow effect when speaking */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/20 blur-xl transition-opacity duration-300",
            isSpeaking ? "opacity-100 animate-pulse" : "opacity-0"
          )}
        />
        
        {/* Avatar image */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          <Avatar className="w-full h-full">
            <AvatarImage 
              src={photo} 
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="text-6xl bg-muted">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          {/* Animated mouth overlay */}
          {isSpeaking && (
            <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Mouth animation bars */}
                <div className="absolute inset-0 flex items-end justify-center gap-0.5">
                  <div 
                    className="w-1.5 bg-primary/60 rounded-full animate-mouth-1"
                    style={{ height: '40%' }}
                  />
                  <div 
                    className="w-1.5 bg-primary/60 rounded-full animate-mouth-2"
                    style={{ height: '60%' }}
                  />
                  <div 
                    className="w-1.5 bg-primary/60 rounded-full animate-mouth-3"
                    style={{ height: '80%' }}
                  />
                  <div 
                    className="w-1.5 bg-primary/60 rounded-full animate-mouth-2"
                    style={{ height: '60%' }}
                  />
                  <div 
                    className="w-1.5 bg-primary/60 rounded-full animate-mouth-1"
                    style={{ height: '40%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Speaking indicator ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-4 transition-all duration-300",
            isSpeaking 
              ? "border-primary animate-speaking-ring" 
              : "border-transparent"
          )}
        />
      </div>
      
      {/* Audio wave visualization */}
      {isSpeaking && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full animate-audio-wave"
              style={{
                animationDelay: `${i * 0.1}s`,
                height: `${Math.random() * 50 + 30}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
