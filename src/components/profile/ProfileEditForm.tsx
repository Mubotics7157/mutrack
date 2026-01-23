import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';
import { Input, Textarea, Button } from '../ui';

interface ProfileEditFormProps {
  member: MemberWithProfile;
  displayedProfileImageUrl: string | null;
  previewImageUrl: string | null;
  setPreviewImageUrl: (url: string | null) => void;
  onClose: () => void;
}

export function ProfileEditForm({
  member,
  displayedProfileImageUrl,
  previewImageUrl,
  setPreviewImageUrl,
  onClose,
}: ProfileEditFormProps) {
  const [profileForm, setProfileForm] = useState({
    name: member.name,
    email: member.email,
    phone: '',
    bio: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const generateProfileImageUploadUrl = useMutation(api.members.generateProfileImageUploadUrl);
  const updateProfileImage = useMutation(api.members.setProfileImage);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      toast.success('Profile updated successfully');
      onClose();
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const triggerProfileImagePicker = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      event.target.value = '';
      return;
    }

    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Profile photos must be 5 MB or smaller');
      event.target.value = '';
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setPreviewImageUrl(tempUrl);
    setIsUploadingPhoto(true);

    try {
      const uploadUrl = await generateProfileImageUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!response.ok) throw new Error('upload failed');

      const { storageId } = (await response.json()) as { storageId: string };
      await updateProfileImage({ storageId });
      toast.success('Profile photo updated');
    } catch {
      setPreviewImageUrl(null);
      toast.error('Failed to upload profile photo');
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      setIsUploadingPhoto(true);
      await updateProfileImage({ storageId: null });
      setPreviewImageUrl(null);
      toast.success('Profile photo removed');
    } catch {
      toast.error('Failed to remove profile photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary">Edit Profile</h2>
      </div>

      <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
        {/* Profile Photo */}
        <div>
          <label className="block mb-3 text-sm font-medium text-text-primary">Profile Photo</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <ProfileAvatar
              name={member.name}
              imageUrl={displayedProfileImageUrl}
              size="xl"
              className="ring-2 ring-border"
            />
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<Upload size={16} />}
                  onClick={triggerProfileImagePicker}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                {displayedProfileImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={handleRemoveProfileImage}
                    disabled={isUploadingPhoto}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-muted">
                PNG, JPG, or GIF up to 5 MB. Your photo appears across the team map and leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">Full Name</label>
            <Input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">Email Address</label>
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-2 text-sm font-medium text-text-primary">Phone Number</label>
            <Input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="(optional)"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-2 text-sm font-medium text-text-primary">Bio</label>
            <Textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" className="flex-1">
            Save Changes
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
