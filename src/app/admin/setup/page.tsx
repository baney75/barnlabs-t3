"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function AdminSetupPage() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    token: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json() as { ok: boolean };

      if (result.ok) {
        router.push("/auth/signin?message=Admin account created successfully");
      } else {
        setError("Invalid token or setup failed. Please check the token from your console.");
      }
    } catch (err) {
      setError("Setup failed. Please try again.");
      console.error("Bootstrap error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">🔧 Admin Setup</CardTitle>
          <CardDescription className="text-center">
            Create the first admin account for BarnLabs.
            <br />
            <strong>Check your console for the bootstrap token.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@barnlabs.net"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your Name"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="token">Bootstrap Token</Label>
              <Input
                id="token"
                type="text"
                value={formData.token}
                onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Copy from console output"
                required
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating Admin..." : "Create Admin Account"}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Check your terminal/console for the bootstrap token</li>
              <li>Look for: <code>[ADMIN-BOOTSTRAP] token: ...</code></li>
              <li>Copy the token and paste it above</li>
              <li>Fill out your admin details and submit</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
