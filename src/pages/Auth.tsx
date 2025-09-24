import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import genezxLogo from "@/assets/genezx-logo.png";

const Auth = () => {
  const { signUp, signIn, user, loading, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState("");
  
  // Form state
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error, data } = await signUp(signUpData.email, signUpData.password, signUpData.name);
    
    if (error) {
      // Handle specific error cases to provide better UX
      if (error.message?.includes("User already registered") || 
          error.message?.includes("already been registered")) {
        setExistingUserEmail(signUpData.email);
        setShowResendConfirmation(true);
        toast({
          title: "Account Already Exists",
          description: "An account with this email already exists. Try signing in or resend confirmation email.",
          variant: "default",
        });
      } else {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Check if user was created or just reactivated
      if (data?.user && !data.user.email_confirmed_at) {
        toast({
          title: "Success!",
          description: "Check your email to verify your account",
        });
      } else if (data?.user && data.user.email_confirmed_at) {
        // User was reactivated (already confirmed)
        toast({
          title: "Welcome back!",
          description: "Your account has been reactivated. You can now sign in.",
        });
      } else {
        toast({
          title: "Success!",
          description: "Check your email to verify your account",
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!existingUserEmail) return;
    
    setIsLoading(true);
    const { error } = await resendConfirmation(existingUserEmail);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Confirmation Email Sent!",
        description: "Check your email for the confirmation link",
      });
      setShowResendConfirmation(false);
    }
    
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(signInData.email, signInData.password);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={genezxLogo} 
              alt="geneZx" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-primary">Smart ATS</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Welcome to your Smart ATS dashboard. Monitor your recruitment activities and optimize your hiring process.
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              Powered by <a href="https://genezx.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">geneZx</a>
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
              
              <div className="text-center text-sm">
                <Link to="/reset-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              {showResendConfirmation ? (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      An account with <strong>{existingUserEmail}</strong> already exists.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You can either sign in with your existing password, or resend the confirmation email if you never received it.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend Confirmation"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowResendConfirmation(false);
                        setSignInData({ ...signInData, email: existingUserEmail });
                        // Switch to sign in tab
                        const signInTab = document.querySelector('[value="signin"]') as HTMLElement;
                        signInTab?.click();
                      }}
                      className="flex-1"
                    >
                      Sign In Instead
                    </Button>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowResendConfirmation(false);
                      setExistingUserEmail("");
                    }}
                    className="w-full"
                  >
                    Try Different Email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;