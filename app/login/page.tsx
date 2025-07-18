"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { loginUser } from "@/lib/auth";
import { testSupabaseConnection } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Eye, EyeOff, Sparkles, Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("system@timeport.com");
  const [password, setPassword] = useState("Passw0rd!");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  // ページ読み込み時にSupabase接続テストを実行
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("ログイン処理開始:", { email, password });

      const user = await loginUser(email, password);
      console.log("loginUser結果:", user);

      if (user) {
        console.log("ログイン成功、コンテキスト更新中...");
        login({
          ...user,
          full_name: user.full_name,
          role: user.role === "system-admin" ? "system-admin" : user.role,
        });

        const redirectPath =
          user.role === "system-admin"
            ? "/system-admin"
            : user.role === "admin"
              ? "/admin"
              : "/member";

        console.log("リダイレクト先:", redirectPath);
        router.push(redirectPath);
      } else {
        console.log("ログイン失敗: ユーザーがnull");
        setError("メールアドレスまたはパスワードが正しくありません");
      }
    } catch (err) {
      console.error("ログイン処理エラー:", err);
      setError("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 固定値のパーティクルデータ
  const particles = [
    { left: "10%", top: "20%", delay: "0s", duration: "2s" },
    { left: "20%", top: "80%", delay: "0.5s", duration: "3s" },
    { left: "30%", top: "40%", delay: "1s", duration: "2.5s" },
    { left: "40%", top: "60%", delay: "1.5s", duration: "3.5s" },
    { left: "50%", top: "30%", delay: "2s", duration: "2s" },
    { left: "60%", top: "70%", delay: "0.3s", duration: "3s" },
    { left: "70%", top: "10%", delay: "1.2s", duration: "2.8s" },
    { left: "80%", top: "50%", delay: "0.8s", duration: "3.2s" },
    { left: "90%", top: "90%", delay: "1.7s", duration: "2.3s" },
    { left: "15%", top: "15%", delay: "0.2s", duration: "3.1s" },
    { left: "25%", top: "85%", delay: "1.4s", duration: "2.7s" },
    { left: "35%", top: "25%", delay: "0.9s", duration: "3.3s" },
    { left: "45%", top: "75%", delay: "1.8s", duration: "2.4s" },
    { left: "55%", top: "35%", delay: "0.6s", duration: "3.4s" },
    { left: "65%", top: "65%", delay: "1.1s", duration: "2.6s" },
    { left: "75%", top: "5%", delay: "0.4s", duration: "3.6s" },
    { left: "85%", top: "45%", delay: "1.6s", duration: "2.9s" },
    { left: "95%", top: "95%", delay: "0.7s", duration: "3.7s" },
    { left: "5%", top: "55%", delay: "1.3s", duration: "2.1s" },
    { left: "18%", top: "38%", delay: "0.1s", duration: "3.8s" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-indigo-400/20 to-cyan-500/20 rounded-full blur-2xl animate-pulse delay-500"></div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}
        </div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader className="text-center pb-8">
          {/* Logo with Glow Effect */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-60"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            TimePort
          </CardTitle>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <p className="text-blue-100 font-medium">勤怠管理システム</p>
            <Sparkles className="w-4 h-4 text-purple-300" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium">
                メールアドレス
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-blue-400/20 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">
                パスワード
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-blue-400/20 backdrop-blur-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>ログイン中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>ログイン</span>
                </div>
              )}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-300" />
              <p className="text-xs text-blue-200 font-semibold">
                デモアカウント
              </p>
            </div>
            <div className="space-y-2 text-xs text-white/80">
              <div className="flex justify-between">
                <span className="font-medium text-purple-200">
                  システム管理者:
                </span>
                <span>system@timeport.com</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-blue-200">管理者:</span>
                <span>admin@timeport.com</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-200">メンバー:</span>
                <span>tanaka@timeport.com</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="font-medium text-yellow-200">パスワード:</span>
                <span>Passw0rd!</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
