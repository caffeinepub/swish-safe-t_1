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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await login(username.trim(), password);
      if (ok) {
        navigate("/dashboard", { replace: true });
      } else {
        setError("Invalid username or password, or account is disabled.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F0F2F5" }}
    >
      <div className="w-full max-w-sm">
        {/* Safe_T Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/assets/safe_t_logo-019d5406-25c0-7178-967e-9ff0b95d2ae1.png"
            alt="SAFE-T"
            className="h-20 object-contain"
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
              <code className="font-mono">SWiSH_SafeArun@21</code>
            </p>
            <p className="mt-0.5">
              Manager: <code className="font-mono">manager_sarah</code> /{" "}
              <code className="font-mono">Manager@123</code>
            </p>
          </div>
        </div>

        {/* Powered by A Plus Automations */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-xs text-muted-foreground">Powered by:</span>
          <img
            src="/assets/logo_aplus-019d58e0-df01-76da-bf58-862ddddba159.png"
            alt="A Plus Automations"
            className="h-7 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
