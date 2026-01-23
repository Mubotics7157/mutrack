import React, { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';

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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      toast.success('profile updated successfully');
      onClose();
    } catch {
      toast.error('failed to update profile');
    }
  };

  const triggerProfileImagePicker = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('please choose an image file');
      event.target.value = '';
      return;
    }

    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('profile photos must be 5 MB or smaller');
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
      toast.success('profile photo updated');
    } catch {
      setPreviewImageUrl(null);
      toast.error('failed to upload profile photo');
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
      toast.success('profile photo removed');
    } catch {
      toast.error('failed to remove profile photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="glass-panel p-8">
      <h2 className="text-xl font-light mb-6">edit profile information</h2>
      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div>
          <label className="block mb-2 text-sm text-text-muted">profile photo</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <ProfileAvatar
              name={member.name}
              imageUrl={displayedProfileImageUrl}
              size="xl"
              className="border-2 border-border-glass"
            />
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-modern btn-primary touch-feedback"
                  onClick={triggerProfileImagePicker}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? 'uploading...' : 'upload new photo'}
                </button>
                {displayedProfileImageUrl && (
                  <button
                    type="button"
                    className="btn-modern touch-feedback"
                    onClick={handleRemoveProfileImage}
                    disabled={isUploadingPhoto}
                  >
                    remove photo
                  </button>
                )}
              </div>
              <p className="text-xs text-text-dim">
                png, jpg, or gif up to 5 MB. your photo appears across the team map and leaderboard.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-muted">full name</label>
          <input
            type="text"
            className="input-modern"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-muted">email address</label>
          <input
            type="email"
            className="input-modern"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-muted">phone number</label>
          <input
            type="tel"
            className="input-modern"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="(optional)"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-muted">bio</label>
          <textarea
            className="input-modern resize-none"
            value={profileForm.bio}
            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
            placeholder="tell us about yourself..."
            rows={4}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" className="btn-modern btn-primary flex-1 touch-feedback">
            save changes
          </button>
          <button type="button" onClick={onClose} className="btn-modern flex-1 touch-feedback">
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}
