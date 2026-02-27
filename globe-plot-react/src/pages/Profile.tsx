import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../lib/firebase";
import { useUserStore } from "../stores/userStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Camera, Loader2, Check, Mail, User, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  const handleSaveName = async () => {
    if (!auth.currentUser) return;
    if (!displayName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setUser({ ...user, displayName: displayName.trim() });
      toast.success("Name updated successfully.");
    } catch {
      toast.error("Failed to update name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploadingPhoto(true);
    try {
      const userId = auth.currentUser.uid;
      // Use a timestamp so each upload creates a new object rather than
      // overwriting the previous one — overwriting invalidates the old
      // download token and causes a race where getDownloadURL returns 403.
      const filePath = `profileImages/${userId}/avatar_${Date.now()}`;
      const fileRef = storageRef(storage, filePath);

      const snapshot = await uploadBytes(fileRef, file, { contentType: file.type });
      const photoURL = await getDownloadURL(snapshot.ref);

      await updateProfile(auth.currentUser, { photoURL });
      setUser({ ...user, photoURL });
      toast.success("Profile photo updated.");
    } catch (err) {
      console.error("Profile photo upload failed:", err);
      toast.error("Failed to upload photo. Please try again.");
      setPhotoPreview(user.photoURL ?? null);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const nameChanged = displayName.trim() !== (user.displayName ?? "");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-8">Your Profile</h1>

        {/* Profile photo */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold ring-4 ring-primary/10">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>
              {isUploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                Upload a photo to personalise your profile. JPEG, PNG, WebP, or GIF, max 5MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="flex items-center gap-1.5"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
              </Button>
            </div>
          </div>
        </div>

        {/* Display name */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Display Name</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameChanged) handleSaveName();
                }}
              />
            </div>
            <Button
              onClick={handleSaveName}
              disabled={isSavingName || !nameChanged}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {isSavingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSavingName ? "Saving..." : "Save Name"}
            </Button>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Account ID</p>
                <p className="text-sm font-medium text-foreground font-mono truncate">{user.uid}</p>
              </div>
            </div>
            {user.providerData?.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Sign-in methods</p>
                <div className="flex flex-wrap gap-2">
                  {user.providerData.map((provider) => (
                    <span
                      key={provider.providerId}
                      className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground capitalize"
                    >
                      {provider.providerId === "google.com"
                        ? "Google"
                        : provider.providerId === "password"
                        ? "Email & Password"
                        : provider.providerId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
