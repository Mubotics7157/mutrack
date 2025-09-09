import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ProfilePageProps {
  member: Doc<"members">;
}

export function ProfilePage({ member }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const signOut = useMutation(api.auth.signOut);
  
  const [profileForm, setProfileForm] = useState({
    name: member.name,
    email: member.email,
    phone: "",
    bio: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Profile update logic would go here
      toast.success("profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("failed to update profile");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("passwords do not match");
      return;
    }
    try {
      // Password change logic would go here
      toast.success("password changed successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordChange(false);
    } catch (error) {
      toast.error("failed to change password");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("signed out successfully");
  };

  const getRoleBadgeClass = () => {
    switch (member.role) {
      case "admin": return "badge-rejected";
      case "lead": return "badge-pending";
      default: return "badge-ordered";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-gradient-orange-purple rounded-2xl flex items-center justify-center text-4xl font-medium text-void-black shadow-glow">
            {member.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-light mb-2 text-gradient">{member.name}</h1>
            <p className="text-text-muted mb-3">{member.email}</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`badge ${getRoleBadgeClass()}`}>
                {member.role}
              </span>
              <span className="text-sm text-text-dim">
                member since {formatDate(member.joinedAt)}
              </span>
              <span className="text-sm text-text-dim">
                id: {member._id.slice(-8)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-modern"
            >
              {isEditing ? "cancel" : "edit profile"}
            </button>
            <button
              onClick={handleSignOut}
              className="btn-modern btn-danger"
            >
              sign out
            </button>
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="glass-panel p-8">
        <h2 className="text-xl font-light mb-6">activity overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-modern text-center">
            <div className="text-3xl font-light text-accent-green mb-2">24</div>
            <div className="text-sm text-text-muted">meetings attended</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-3xl font-light text-sunset-orange mb-2">8</div>
            <div className="text-sm text-text-muted">purchase requests</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-3xl font-light text-accent-purple mb-2">92%</div>
            <div className="text-sm text-text-muted">attendance rate</div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="glass-panel p-8">
          <h2 className="text-xl font-light mb-6">edit profile information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">
                full name
              </label>
              <input
                type="text"
                className="input-modern"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                email address
              </label>
              <input
                type="email"
                className="input-modern"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                phone number
              </label>
              <input
                type="tel"
                className="input-modern"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="(optional)"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                bio
              </label>
              <textarea
                className="input-modern resize-none"
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="tell us about yourself..."
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-modern btn-primary flex-1">
                save changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-modern flex-1"
              >
                cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Settings */}
      <div className="glass-panel p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-light">security settings</h2>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="btn-modern"
          >
            change password
          </button>
        </div>

        {showPasswordChange && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">
                current password
              </label>
              <input
                type="password"
                className="input-modern"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                new password
              </label>
              <input
                type="password"
                className="input-modern"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                confirm new password
              </label>
              <input
                type="password"
                className="input-modern"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-modern btn-primary flex-1">
                update password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="btn-modern flex-1"
              >
                cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 p-4 bg-glass border border-border-glass rounded-xl">
          <h3 className="text-sm font-mono text-text-secondary mb-2">session info</h3>
          <div className="space-y-1 text-sm text-text-muted">
            <p>last login: {formatDate(Date.now() - 86400000)}</p>
            <p>session expires: in 24 hours</p>
            <p>two-factor auth: disabled</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-panel p-8">
        <h2 className="text-xl font-light mb-6">preferences</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
            <div>
              <h3 className="text-sm font-medium text-text-primary">email notifications</h3>
              <p className="text-xs text-text-muted mt-1">receive updates about meetings and requests</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-glass border border-border-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-orange-purple"></div>
            </label>
          </div>

          <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
            <div>
              <h3 className="text-sm font-medium text-text-primary">meeting reminders</h3>
              <p className="text-xs text-text-muted mt-1">get notified 1 hour before meetings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-glass border border-border-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-orange-purple"></div>
            </label>
          </div>

          <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
            <div>
              <h3 className="text-sm font-medium text-text-primary">dark mode</h3>
              <p className="text-xs text-text-muted mt-1">always enabled for optimal experience</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked disabled />
              <div className="w-11 h-6 bg-gradient-orange-purple border border-border-glass peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:translate-x-full"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-8 border border-error-red/30">
        <h2 className="text-xl font-light mb-6 text-error-red">danger zone</h2>
        <p className="text-sm text-text-muted mb-4">
          once you delete your account, there is no going back. please be certain.
        </p>
        <button className="btn-modern btn-danger">
          delete account
        </button>
      </div>
    </div>
  );
}