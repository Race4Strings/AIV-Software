"use client";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (password.length === 0) return null;

  const strength =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const barColors = ["bg-destructive", "bg-warning", "bg-warning", "bg-success"];
  const textColors = ["text-destructive", "text-warning", "text-warning", "text-success"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength ? barColors[strength - 1] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs ${
          password.length < 8 ? "text-muted-foreground" : textColors[strength - 1]
        }`}
      >
        {password.length < 8 ? "At least 8 characters" : labels[strength]}
      </p>
    </div>
  );
}
