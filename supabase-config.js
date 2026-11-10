(() => {
  "use strict";

  const projectUrl = "https://wfbvdfdwjvahqgidnany.supabase.co";
  const publishableKey = "sb_publishable_7v-7lAERmJray1VRPiz3hg_vVwbOGlD";
  if (!window.supabase?.createClient) {
    throw new Error("Supabase JS did not load. Check network and CDN access.");
  }

  window.orbitSupabase = window.supabase.createClient(projectUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const identityStorageKey = "orbit-profile";
  window.orbitSetIdentity = (profile) => {
    sessionStorage.setItem(identityStorageKey, JSON.stringify(profile));
  };
  window.orbitGetIdentity = (requiredRole) => {
    let profile;
    try {
      profile = JSON.parse(sessionStorage.getItem(identityStorageKey) || "null");
    } catch (error) {
      console.error("Could not read the selected profile:", error);
      sessionStorage.removeItem(identityStorageKey);
      return null;
    }
    if (!profile || !profile.id || !profile.display_name ||
        !["employee", "manager"].includes(profile.role) ||
        (requiredRole && profile.role !== requiredRole)) {
      return null;
    }
    return profile;
  };
  window.orbitClearIdentity = () => sessionStorage.removeItem(identityStorageKey);
})();

 