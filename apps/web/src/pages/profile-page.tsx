import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { z } from "zod";

import { useAuth } from "../features/auth/auth-context";
import { supabase } from "../lib/supabase";
import { syncServerUrl } from "../lib/env";

const profileSchema = z.object({
  display_name: z.string().nullable(),
  avatar_url: z.url().nullable(),
});

export function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadRequestRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Profile could not be loaded.", error);
          setStatus("Profile could not be loaded.");
          return;
        }
        const parsed = profileSchema.safeParse(data);
        if (parsed.success) {
          setDisplayName(parsed.data.display_name ?? "");
          setAvatarUrl(parsed.data.avatar_url);
        }
      });
  }, [user]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !user || displayName.trim().length < 2) return;
    setStatus("Saving…");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    if (error) {
      console.error("Profile could not be updated.", error);
      setStatus("Profile could not be updated.");
      return;
    }
    setStatus("Profile saved.");
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !syncServerUrl) {
      setStatus("The sync worker is required for avatar uploads.");
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setStatus("Choose a PNG, JPEG, WebP, or GIF up to 5 MB.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      setStatus("Your session expired. Sign in again.");
      return;
    }
    const request = new XMLHttpRequest();
    uploadRequestRef.current = request;
    setUploadProgress(0);
    setStatus("Uploading avatar…");
    request.open("PUT", `${syncServerUrl}/profile/avatar`);
    request.setRequestHeader(
      "Authorization",
      `Bearer ${data.session.access_token}`,
    );
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) {
        setUploadProgress(
          Math.round((progressEvent.loaded / progressEvent.total) * 100),
        );
      }
    };
    request.onerror = () => {
      setUploadProgress(null);
      setStatus("Avatar upload failed.");
      uploadRequestRef.current = null;
    };
    request.onabort = () => {
      setUploadProgress(null);
      setStatus("Avatar upload cancelled.");
      uploadRequestRef.current = null;
    };
    request.onload = () => {
      setUploadProgress(null);
      uploadRequestRef.current = null;
      try {
        const result = JSON.parse(request.responseText) as {
          error?: string;
          url?: string;
        };
        if (request.status < 200 || request.status >= 300 || !result.url) {
          setStatus(result.error ?? "Avatar upload failed.");
          return;
        }
        setAvatarUrl(result.url);
        setStatus("Avatar updated.");
      } catch {
        setStatus("Avatar upload returned an invalid response.");
      }
    };
    request.send(file);
  };

  const removeAvatar = async () => {
    if (!supabase || !syncServerUrl) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    setStatus("Removing avatar…");
    const response = await fetch(`${syncServerUrl}/profile/avatar`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
    if (!response.ok) {
      setStatus("Avatar could not be removed.");
      return;
    }
    setAvatarUrl(null);
    setStatus("Avatar removed.");
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted">
        Update the name collaborators will see.
      </p>
      <form
        className="mt-8 max-w-md space-y-5 border-t border-line pt-6"
        onSubmit={saveProfile}
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              alt=""
              className="size-12 rounded-full object-cover"
              src={avatarUrl}
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-avatar text-sm font-semibold text-avatar-ink">
              {displayName.slice(0, 2).toUpperCase() || "CC"}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center border border-line px-3 text-xs font-medium hover:bg-hover">
              Change avatar
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={uploadProgress !== null}
                onChange={(event) => void uploadAvatar(event)}
                type="file"
              />
            </label>
            {avatarUrl && (
              <button
                className="h-9 px-2 text-xs font-medium text-danger"
                disabled={uploadProgress !== null}
                onClick={() => void removeAvatar()}
                type="button"
              >
                Remove
              </button>
            )}
            {uploadProgress !== null && (
              <button
                className="h-9 px-2 text-xs font-medium"
                onClick={() => uploadRequestRef.current?.abort()}
                type="button"
              >
                Cancel ({uploadProgress}%)
              </button>
            )}
          </div>
        </div>
        <label className="block text-sm font-medium">
          Display name
          <input
            className="mt-1.5 h-10 w-full border border-line bg-panel px-3 font-normal"
            maxLength={80}
            minLength={2}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal text-muted"
            disabled
            value={user?.email ?? ""}
          />
        </label>
        {status && (
          <p aria-live="polite" className="text-sm text-muted">
            {status}
          </p>
        )}
        <button
          className="h-9 bg-accent px-3 text-sm font-medium text-white"
          type="submit"
        >
          Save profile
        </button>
      </form>
    </main>
  );
}
