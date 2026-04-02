import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in
  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const ok = login(username.trim(), password);
      setLoading(false);
      if (ok) {
        navigate("/dashboard", { replace: true });
      } else {
        setError("Invalid username or password, or account is disabled.");
      }
    }, 200);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F0F2F5" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/assets/generated/swish-safet-logo-transparent.dim_400x120.png"
            alt="SWiSH SAFE-T"
            className="h-14 object-contain"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-shell p-8 border border-border">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: "#96BB1A22" }}
            >
              <ShieldCheck className="w-6 h-6" style={{ color: "#96BB1A" }} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Safety Inspection Management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-9"
                  autoComplete="username"
                  required
                  data-ocid="login.input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9"
                  autoComplete="current-password"
                  required
                  data-ocid="login.input"
                />
              </div>
            </div>

            {error && (
              <div
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                data-ocid="login.error_state"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading}
              style={{ backgroundColor: "#96BB1A", color: "#111" }}
              data-ocid="login.submit_button"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Demo credentials:</p>
            <p>
              Admin: <code className="font-mono">APA_Arun</code> /{" "}
              <code className="font-mono">APA@2024</code>
            </p>
            <p className="mt-0.5">
              Manager: <code className="font-mono">manager_sarah</code> /{" "}
              <code className="font-mono">Manager@123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
